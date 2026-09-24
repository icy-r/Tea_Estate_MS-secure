#!/usr/bin/env bash
# Black-box security checks for Tea_Estate_MS. Each check asserts the SECURE
# behaviour, so on the original code they FAIL and after the fixes they PASS.
# Usage: API=http://localhost:3001 ./security-tests/poc.sh
API=${API:-http://localhost:3001}
pass=0; fail=0
check() { # name, condition-exit-code
  if [ "$2" -eq 0 ]; then echo "PASS  $1"; pass=$((pass+1)); else echo "FAIL  $1"; fail=$((fail+1)); fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
login() { curl -s -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$2\"}" "$API/api/auth/login" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p'; }
payload() { cut -d. -f2 <<<"$1" | tr '_-' '/+' | base64 -d 2>/dev/null; }

MGR=$(login manager@tea.test 'Manager#Pass2026')
LAB=$(login labour@tea.test 'Labour#Pass2026')

# V1 NoSQL injection: an operator object must be rejected, not matched against a user
r=$(curl -s -w ' %{http_code}' -H 'Content-Type: application/json' -d '{"email":{"$ne":null},"password":"x"}' "$API/api/auth/login")
[[ "$r" != *"Incorrect password"* && "$r" == *" 400" ]]; check "V1  NoSQL operator injection on login is rejected" $?

# V2 Broken access control
[ "$(code "$API/api/employees")" = 401 ]; check "V2  GET /api/employees without a token -> 401" $?
[ "$(code "$API/api/applicantManagement")" = 401 ]; check "V2  GET /api/applicantManagement without a token -> 401" $?
[ "$(code -H "Authorization: Bearer $LAB" "$API/api/employees")" = 403 ]; check "V2  Labour cannot list employees (role check) -> 403" $?
[ "$(code -H "Authorization: Bearer $MGR" "$API/api/employees")" = 200 ]; check "V2  Employee Manager can list employees -> 200" $?
[ "$(code "$API/api/applicantRoles")" = 200 ]; check "V2  Public vacancies still reachable -> 200" $?

# V3 Token and API responses must not carry the password hash
p=$(payload "$MGR"); [[ -n "$MGR" && "$p" != *password* && "$p" != *salary* ]]; check "V3  JWT payload has no password hash or salary" $?
b=$(curl -s -H "Authorization: Bearer $MGR" "$API/api/employees"); [[ "$b" != *'$2b$'* ]]; check "V3  Employee list does not expose bcrypt hashes" $?

# V4 Mass assignment / self-registration as a manager
c=$(code -H 'Content-Type: application/json' -d '{"firstName":"Mal","lastName":"Ory","Id":"PWN-1","email":"pwn@tea.test","age":30,"gender":"m","dateOfBirth":"1990-01-01","contactNumber":"0770000000","designation":"Repair Manager","department":"Repair","dateOfJoining":"2020-01-01","salary":999999,"leavesLeft":"10","address":"x","password":"Pwned#12345"}' "$API/api/auth/signup")
[ "$c" = 401 ]; check "V4  Anonymous signup as Repair Manager is refused" $?

# V6 Security headers + CORS
h=$(curl -s -D - -o /dev/null -H 'Origin: https://evil.example' "$API/api/applicantRoles")
[[ "$h" != *"X-Powered-By"* && "$h" == *"X-Content-Type-Options: nosniff"* ]]; check "V6  Helmet headers set, X-Powered-By removed" $?
[[ "$h" != *"Access-Control-Allow-Origin: *"* && "$h" != *"Access-Control-Allow-Origin: https://evil.example"* ]]; check "V6  CORS does not allow arbitrary origins" $?

# V7 Error leakage
e=$(curl -s -H "Authorization: Bearer $MGR" "$API/api/employees/not-an-object-id")
[[ "$e" != *CastError* && "$e" != *"ObjectId"* ]]; check "V7  Invalid id does not leak Mongoose internals" $?

# V11 change-password must verify the current password
[ "$(code -H "Authorization: Bearer $LAB" -H 'Content-Type: application/json' -d '{"password":"wrong","newPassword":"Hacked#12345"}' "$API/api/auth/change-password")" = 401 ]
check "V11 change-password with a wrong current password -> 401" $?

# V13 Open mail relay
[ "$(code -H 'Content-Type: application/json' -d '{"to":"victim@example.com","subject":"x","text":"spam"}' "$API/send-email")" = 401 ]
check "V13 /send-email refuses anonymous callers" $?

# V5 Brute force: repeated failed logins must be throttled (run last, it trips the limiter)
last=0; for i in $(seq 1 12); do last=$(code -H 'Content-Type: application/json' -d '{"email":"manager@tea.test","password":"guess'$i'"}' "$API/api/auth/login"); done
[ "$last" = 429 ]; check "V5  12 failed logins -> 429 Too Many Requests" $?

echo "---- $pass passed, $fail failed"
