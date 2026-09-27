#!/usr/bin/env bash
# Extra checks for V5, V6 and V7. Same helpers as poc.sh.
# Usage: API=http://localhost:3001 ./security-tests/poc-samudith.sh
API=${API:-http://localhost:3001}
pass=0; fail=0
check() { # name, condition-exit-code
  if [ "$2" -eq 0 ]; then echo "PASS  $1"; pass=$((pass+1)); else echo "FAIL  $1"; fail=$((fail+1)); fi
}
login() { curl -s -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$2\"}" "$API/api/auth/login" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p'; }

# V6: public vacancies response carries HSTS and a content security policy.
h=$(curl -s -D - -o /dev/null "$API/api/applicantRoles")
[[ "$h" == *"Strict-Transport-Security"* && "$h" == *"Content-Security-Policy"* ]]
check "V6  GET /api/applicantRoles sends HSTS and CSP" $?

# V5: a failed login tells the client how many attempts remain.
h=$(curl -s -D - -o /dev/null -H 'Content-Type: application/json' -d '{"email":"nobody@tea.test","password":"wrong-password"}' "$API/api/auth/login")
[[ "$h" == *"RateLimit"* ]]
check "V5  failed login response includes a RateLimit header" $?

# V7: a bad id is a generic 404, with no Mongoose details.
MGR=$(login manager@tea.test 'Manager#Pass2026')
resp=$(curl -s -w '\n%{http_code}' -H "Authorization: Bearer $MGR" "$API/api/employees/abc")
status=$(printf '%s\n' "$resp" | tail -n 1)
body=$(printf '%s\n' "$resp" | sed '$d')
[[ -n "$MGR" && "$status" = "404" && "$body" == *'"error":"Invalid identifier"'* && "$body" != *CastError* && "$body" != *ObjectId* && "$body" != *stack* ]]
check "V7  GET /api/employees/abc is 404 Invalid identifier, with no internals" $?

echo "---- $pass passed, $fail failed"
[ "$fail" -eq 0 ]
