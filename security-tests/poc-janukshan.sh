#!/usr/bin/env bash
# Extra black-box checks for V4 (mass assignment / ownership) and V11
# (change-password), same style as poc.sh: each check asserts the SECURE
# behaviour. Needs the accounts from backend/scripts/seed-security.js.
# Run it before poc.sh (poc.sh ends by tripping the login rate limiter).
# Usage: API=http://localhost:3001 ./security-tests/poc-janukshan.sh
API=${API:-http://localhost:3001}
pass=0; fail=0
check() { # name, condition-exit-code
  if [ "$2" -eq 0 ]; then echo "PASS  $1"; pass=$((pass+1)); else echo "FAIL  $1"; fail=$((fail+1)); fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
login() { curl -s -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$2\"}" "$API/api/auth/login" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p'; }
payload() { cut -d. -f2 <<<"$1" | tr '_-' '/+' | base64 -d 2>/dev/null; }
# field NAME JSON -> first value of "NAME" in a flat JSON body (quotes stripped)
field() { grep -o "\"$1\":[^,}]*" <<<"$2" | head -1 | cut -d: -f2- | tr -d '"'; }
json=(-H 'Content-Type: application/json')

MGR=$(login manager@tea.test 'Manager#Pass2026')
LAB=$(login labour@tea.test 'Labour#Pass2026')
if [ -z "$MGR" ] || [ -z "$LAB" ]; then
  echo "Login failed: run backend/scripts/seed-security.js, or wait 15 min if rate-limited"; exit 1
fi
LAB_ID=$(field _id "$(payload "$LAB")")
MGR_ID=$(field _id "$(payload "$MGR")")

# V4 Self-update: Labour may change personal fields on their own record, but
# salary and designation in the same body must be ignored (SELF_FIELDS allow-list)
before=$(curl -s -H "Authorization: Bearer $LAB" "$API/api/employees/$LAB_ID")
c=$(code -X PUT -H "Authorization: Bearer $LAB" "${json[@]}" \
  -d '{"address":"Line 5 Estate Quarters","salary":999999,"designation":"Employee Manager","department":"Employee"}' \
  "$API/api/employees/$LAB_ID")
after=$(curl -s -H "Authorization: Bearer $LAB" "$API/api/employees/$LAB_ID")
[[ "$c" = 200 && -n "$(field salary "$before")" \
  && "$(field salary "$after")" = "$(field salary "$before")" \
  && "$(field designation "$after")" = "$(field designation "$before")" \
  && "$(field address "$after")" = "Line 5 Estate Quarters" ]]
check "V4  Labour self-update keeps salary/designation, saves address" $?

# V4 Ownership: Labour cannot read another employee's record
[ "$(code -H "Authorization: Bearer $LAB" "$API/api/employees/$MGR_ID")" = 403 ]
check "V4  Labour cannot read another employee's record -> 403" $?

# V4 follow-up (leave module): a new request is filed under the caller's own
# email and always starts Pending, whatever the body says
r=$(curl -s -H "Authorization: Bearer $LAB" "${json[@]}" \
  -d '{"Name":"Lal Labour","Reason":"PoC","DateFrom":"2026-10-01","DateTo":"2026-10-02","type":"Casual","Email":"manager@tea.test","status":"Approved"}' \
  "$API/api/employeeProfile")
LEAVE_ID=$(field _id "$r")
[[ -n "$LEAVE_ID" && "$(field Email "$r")" = "labour@tea.test" && "$(field status "$r")" = "Pending" ]]
check "V4  New leave request ignores Email/status from the body" $?

# ...and the owner cannot approve it themselves
curl -s -o /dev/null -X PUT -H "Authorization: Bearer $LAB" "${json[@]}" -d '{"status":"Approved"}' "$API/api/employeeProfile/$LEAVE_ID"
s=$(field status "$(curl -s -H "Authorization: Bearer $MGR" "$API/api/employeeProfile/$LEAVE_ID")")
[ "$s" = "Pending" ]; check "V4  Labour cannot approve their own leave request" $?

# ...and sees only their own requests, not the manager's
m=$(curl -s -H "Authorization: Bearer $MGR" "${json[@]}" \
  -d '{"Name":"Mira Manager","Reason":"PoC","DateFrom":"2026-10-05","DateTo":"2026-10-05","type":"Casual"}' \
  "$API/api/employeeProfile")
emails=$(curl -s -H "Authorization: Bearer $LAB" "$API/api/employeeProfile" | grep -o '"Email":"[^"]*"' | sort -u)
[[ -n "$(field _id "$m")" && "$emails" = '"Email":"labour@tea.test"' ]]
check "V4  Labour's leave list contains only their own requests" $?
curl -s -o /dev/null -X DELETE -H "Authorization: Bearer $MGR" "$API/api/employeeProfile/$(field _id "$m")"

# ...while the Employee Manager can still approve (the feature still works)
c=$(code -X PUT -H "Authorization: Bearer $MGR" "${json[@]}" -d '{"status":"Approved"}' "$API/api/employeeProfile/$LEAVE_ID")
s=$(field status "$(curl -s -H "Authorization: Bearer $MGR" "$API/api/employeeProfile/$LEAVE_ID")")
[[ "$c" = 200 && "$s" = "Approved" ]]; check "V4  Employee Manager can approve a leave request" $?
curl -s -o /dev/null -X DELETE -H "Authorization: Bearer $MGR" "$API/api/employeeProfile/$LEAVE_ID"

# V11 Weak new password: correct current password but a 5-character new one -> 400,
# and the old password must still work afterwards
c=$(code -H "Authorization: Bearer $LAB" "${json[@]}" -d '{"password":"Labour#Pass2026","newPassword":"short"}' "$API/api/auth/change-password")
[[ "$c" = 400 && -n "$(login labour@tea.test 'Labour#Pass2026')" ]]
check "V11 change-password rejects a 5-character new password -> 400" $?

echo "---- $pass passed, $fail failed"
