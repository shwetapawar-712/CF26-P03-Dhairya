import asyncio
import httpx
from app.main import app
from app.auth import seed_default_users
from app.database import create_tables

async def full_diagnostic_test():
    print("=================================================================")
    print("  VERIFLOW END-TO-END AUTH, APPROVAL & SECURITY TEST SUITE")
    print("=================================================================")
    
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health
        r = await client.get("/health")
        assert r.status_code == 200
        print("[PASS] 1. Health check")

        # 2. Unauthenticated access to /api/auth/me -> 401
        r_unauth = await client.get("/api/auth/me")
        assert r_unauth.status_code == 401
        print("[PASS] 2. Unauthenticated /api/auth/me returns 401")

        # 3. Employee login with bad password -> 401
        r_bad = await client.post("/api/auth/login", json={"username": "employee", "password": "wrongpassword"})
        assert r_bad.status_code == 401
        print("[PASS] 3. Invalid password returns 401")

        # 4. Employee login
        r_emp = await client.post("/api/auth/login", json={"username": "employee", "password": "employee123"})
        assert r_emp.status_code == 200
        emp_data = r_emp.json()
        assert emp_data["user"]["app_role"] == "employee"
        emp_token = emp_data["access_token"]
        emp_headers = {"Authorization": f"Bearer {emp_token}"}
        print("[PASS] 4. Employee login successful (app_role: employee)")

        # 5. Manager login
        r_mgr = await client.post("/api/auth/login", json={"username": "manager", "password": "manager123"})
        assert r_mgr.status_code == 200
        mgr_data = r_mgr.json()
        assert mgr_data["user"]["app_role"] == "manager"
        mgr_token = mgr_data["access_token"]
        mgr_headers = {"Authorization": f"Bearer {mgr_token}"}
        print("[PASS] 5. Manager login successful (app_role: manager)")

        # 6. /api/auth/me with tokens
        r_me_emp = await client.get("/api/auth/me", headers=emp_headers)
        assert r_me_emp.status_code == 200 and r_me_emp.json()["app_role"] == "employee"
        r_me_mgr = await client.get("/api/auth/me", headers=mgr_headers)
        assert r_me_mgr.status_code == 200 and r_me_mgr.json()["app_role"] == "manager"
        print("[PASS] 6. /api/auth/me returns correct user & app_role")

        # 7. Employee blocked from rule management (POST, PATCH, DELETE)
        r_emp_rule_post = await client.post("/api/compliance-rules", json={
            "name": "Test Rule", "rule_type": "threshold", "threshold": 10000,
            "description": "Test", "required_action": "finance_approval", "severity": "high", "active": True
        }, headers=emp_headers)
        assert r_emp_rule_post.status_code == 403
        
        r_emp_rule_patch = await client.patch("/api/compliance-rules/1/toggle", headers=emp_headers)
        assert r_emp_rule_patch.status_code == 403

        r_emp_rule_del = await client.delete("/api/compliance-rules/1", headers=emp_headers)
        assert r_emp_rule_del.status_code == 403
        print("[PASS] 7. Employee strictly forbidden (403) from creating/toggling/deleting compliance rules")

        # 8. Manager allowed rule management
        r_mgr_rule_post = await client.post("/api/compliance-rules", json={
            "name": "Special Test Rule", "rule_type": "threshold", "threshold": 99999,
            "description": "Special Rule Condition", "required_action": "finance_approval", "severity": "high", "active": True
        }, headers=mgr_headers)
        assert r_mgr_rule_post.status_code == 200
        created_rule_id = r_mgr_rule_post.json()["rule_id"]
        
        r_mgr_rule_patch = await client.patch(f"/api/compliance-rules/{created_rule_id}/toggle", headers=mgr_headers)
        assert r_mgr_rule_patch.status_code == 200
        
        r_mgr_rule_del = await client.delete(f"/api/compliance-rules/{created_rule_id}", headers=mgr_headers)
        assert r_mgr_rule_del.status_code == 200
        print("[PASS] 8. Manager authorized for rule creation, toggle, and deletion")

        # 9. Employee compiles workflow and submits for approval
        policy = "Whenever we purchase 100 Laptops from Lenovo India for \u20b980,00,000 for the IT department with an available budget of \u20b91,20,00,000, verify the vendor, check whether the department has enough budget, obtain Finance approval, and then create the purchase order."
        r_v = await client.post("/api/verify", json={"policy_text": policy})
        assert r_v.status_code == 200
        v_data = r_v.json()
        assert v_data["verification"]["passed"] is True
        wf_id = v_data["workflow_id"]
        verif_id = v_data["verification"]["verification_id"]
        wf_ir = v_data["workflow_ir"]
        print(f"[PASS] 9a. Workflow verified (ID: {wf_id}, Verification Token: {verif_id})")

        # Employee creates approval request
        r_appr_create = await client.post("/api/approval-requests", json={
            "workflow_id": wf_id,
            "policy_text": policy,
            "workflow_name": "Lenovo Laptop Purchase",
            "verification_id": verif_id
        }, headers=emp_headers)
        assert r_appr_create.status_code in (200, 201)
        appr_req_id = r_appr_create.json()["id"]
        assert r_appr_create.json()["status"] == "pending"
        print(f"[PASS] 9b. Employee submitted approval request #{appr_req_id} (Status: pending)")

        # Employee attempts to approve -> 403
        r_emp_appr = await client.post(f"/api/approval-requests/{appr_req_id}/approve", headers=emp_headers)
        assert r_emp_appr.status_code == 403
        print("[PASS] 9c. Employee cannot approve request (403 Forbidden)")

        # Employee attempts to execute while PENDING -> 403
        r_emp_exec = await client.post("/api/execute/create", json={
            "workflow_ir": wf_ir,
            "verification_id": verif_id,
            "workflow_id": wf_id
        }, headers=emp_headers)
        assert r_emp_exec.status_code == 403
        print("[PASS] 9d. Execution gate strictly BLOCKED while pending manager approval (403 Forbidden)")

        # Manager checks pending list
        r_mgr_reqs = await client.get("/api/approval-requests", headers=mgr_headers)
        assert r_mgr_reqs.status_code == 200
        matching = [x for x in r_mgr_reqs.json() if x["id"] == appr_req_id]
        assert len(matching) == 1
        print("[PASS] 9e. Manager pending approval list contains the submitted request")

        # Manager approves the request
        r_mgr_approve = await client.post(f"/api/approval-requests/{appr_req_id}/approve", headers=mgr_headers)
        assert r_mgr_approve.status_code == 200
        assert r_mgr_approve.json()["status"] == "approved"
        print(f"[PASS] 9f. Manager approved request #{appr_req_id}")

        # Now Execution proceeds
        r_exec_start = await client.post("/api/execute/create", json={
            "workflow_ir": wf_ir,
            "verification_id": verif_id,
            "workflow_id": wf_id
        }, headers=emp_headers)
        assert r_exec_start.status_code == 200
        print("[PASS] 9g. Execution initialized successfully after manager approval")

        # Advance execution step 1 (identify_vendor)
        r_step1 = await client.post("/api/execute/step", json={"workflow_id": wf_id}, headers=emp_headers)
        assert r_step1.status_code == 200
        assert r_step1.json()["current_step"] == "identify_vendor"
        print("[PASS] 9h. Step 1 executed: identify_vendor")

        # Advance execution step 2 (verify_vendor)
        r_step2 = await client.post("/api/execute/step", json={"workflow_id": wf_id}, headers=emp_headers)
        assert r_step2.status_code == 200
        assert r_step2.json()["current_step"] == "verify_vendor"
        print("[PASS] 9i. Step 2 executed: verify_vendor")

        # Advance execution step 3 (check_budget)
        r_step3 = await client.post("/api/execute/step", json={"workflow_id": wf_id}, headers=emp_headers)
        assert r_step3.status_code == 200
        assert r_step3.json()["current_step"] in ("check_budget", "budget_check")
        print("[PASS] 9j. Step 3 executed: budget check")

        # Advance execution step 4 (finance_approval gate)
        r_step4 = await client.post("/api/execute/step", json={"workflow_id": wf_id}, headers=emp_headers)
        assert r_step4.status_code == 200
        assert r_step4.json()["waiting_approval_step"] is not None
        print("[PASS] 9k. Step 4 paused at Finance Approval business sign-off")

        # Approve Finance step
        r_fin_appr = await client.post("/api/execute/approve", json={
            "workflow_id": wf_id,
            "approved": True,
            "user_role": "Finance Manager"
        }, headers=emp_headers)
        assert r_fin_appr.status_code == 200
        print("[PASS] 9l. Human Business Finance Approval granted")

        # Complete PO Generation
        r_step_po = await client.post("/api/execute/step", json={"workflow_id": wf_id}, headers=emp_headers)
        assert r_step_po.status_code == 200
        assert r_step_po.json()["is_complete"] is True
        print("[PASS] 9m. Workflow execution reached COMPLETED state with Purchase Order generated")

        # 10. Check Casbin RBAC Matrix is intact
        r_rbac = await client.get("/api/rbac/matrix")
        assert r_rbac.status_code == 200
        perms = r_rbac.json().get("permissions", [])
        assert len(perms) > 0
        print(f"[PASS] 10. Casbin RBAC matrix intact ({len(perms)} policies)")

        # 11. Test Rejection flow on a new workflow
        r_v2 = await client.post("/api/verify", json={"policy_text": policy})
        wf_id2 = r_v2.json()["workflow_id"]
        verif_id2 = r_v2.json()["verification"]["verification_id"]
        
        r_appr2 = await client.post("/api/approval-requests", json={
            "workflow_id": wf_id2,
            "policy_text": policy,
            "workflow_name": "Rejected Test WF",
            "verification_id": verif_id2
        }, headers=emp_headers)
        req_id2 = r_appr2.json()["id"]
        
        # Manager rejects
        r_rej = await client.post(f"/api/approval-requests/{req_id2}/reject", json={"rejection_reason": "Budget cap exceeded for Q3"}, headers=mgr_headers)
        assert r_rej.status_code == 200
        assert r_rej.json()["status"] == "rejected"
        
        # Execution is blocked
        r_rej_exec = await client.post("/api/execute/create", json={
            "workflow_ir": r_v2.json()["workflow_ir"],
            "verification_id": verif_id2,
            "workflow_id": wf_id2
        }, headers=emp_headers)
        assert r_rej_exec.status_code == 403
        print("[PASS] 11. Rejection flow verified — execution permanently blocked on rejected workflow")

        # 12. Test Restart & Persistence simulation
        print("Simulating backend restart and re-seeding...")
        await create_tables()
        await seed_default_users()

        # Check that previous workflow #1 still has status and data
        r_wf_list = await client.get("/api/workflows")
        assert r_wf_list.status_code == 200
        saved_wf1 = next((w for w in r_wf_list.json() if w["workflow_id"] == wf_id), None)
        assert saved_wf1 is not None
        assert saved_wf1["approval_status"] == "approved"
        print(f"[PASS] 12a. Workflow #{wf_id} persisted across restart with status: {saved_wf1['approval_status']}")

        # Re-login employee & manager after restart
        r_emp_relogin = await client.post("/api/auth/login", json={"username": "employee", "password": "employee123"})
        assert r_emp_relogin.status_code == 200
        r_mgr_relogin = await client.post("/api/auth/login", json={"username": "manager", "password": "manager123"})
        assert r_mgr_relogin.status_code == 200
        print("[PASS] 12b. Logins work perfectly after restart and re-seeding")

    print("=================================================================")
    print("  ALL 12 END-TO-END TEST SUITES PASSED FLAWLESSLY!")
    print("=================================================================")

if __name__ == "__main__":
    asyncio.run(full_diagnostic_test())
