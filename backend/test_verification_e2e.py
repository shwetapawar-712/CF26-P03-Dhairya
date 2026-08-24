"""
End-to-End Verification Gate & Security Test Suite.
Tests:
1. Workflow Verification Layer (Semantic, RBAC, Graph Topology, Compliance, Conflict Detection)
2. Vendor Evidence Verification Layer (Authoritative Registry Signals, Distinct Entity Profiles)
3. Specific Vendor Test Cases:
   - TEST A: XYZ Innovative Solutions Pvt Ltd (Insufficient Evidence / Unknown / Blocked)
   - TEST B: Lenovo India (Verified Public Registry Evidence / MCA Delhi / GSTN / EV SSL / ISO)
   - TEST C: Dell Technologies (Independent Bangalore ROC / Karnataka GSTN / dell.com / ISO)
   - TEST D: Missing Vendor Name (Needs Clarification / No Assumptions)
4. Runtime Execution Security Gating & Dual-Layer Enforcement
"""

import asyncio
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from app.services.verification_gate import run_full_pipeline, run_verification_gate, validate_verification_token
from app.services.nlp_parser import parse_policy, extract_procurement_request
from app.services.ir_builder import build_ir
from app.services.vendor_verifier import verify_vendor_signals
from app.services import execution_simulator

async def run_tests():
    print("================================================================")
    print(" RUNNING END-TO-END DUAL-LAYER VERIFICATION TEST SUITE")
    print("================================================================")
    
    # -------------------------------------------------------------------------
    # TEST 1: Workflow Verification Layer (Standard Valid Workflow)
    # -------------------------------------------------------------------------
    print("\n--- TEST 1: Workflow Verification Layer (Valid Workflow Structure) ---")
    t1_text = "Verify the vendor, check the budget, obtain finance approval, and create the procurement ticket."
    res1 = await run_full_pipeline(t1_text)
    v1 = res1.verification
    print(f"Workflow Passed: {v1.passed}")
    print(f"Execution Allowed: {v1.execution_allowed}")
    print(f"Verification ID: {v1.verification_id}")
    print(f"Workflow Score: {v1.score} | Risk: {v1.risk_level}")
    print(f"Passed Checks: {v1.passed_checks}")
    print(f"Failed Checks: {v1.failed_checks}")
    assert v1.passed is True, "Test 1 must PASS workflow verification gate"
    assert v1.execution_allowed is True, "Test 1 must allow execution"
    assert v1.verification_id is not None, "Test 1 must have a verification ID"
    assert len(v1.failed_checks) == 0, "Test 1 must have 0 failed checks"
    print(">>> TEST 1 PASSED [OK]")

    # -------------------------------------------------------------------------
    # TEST 2: Workflow Verification — Ambiguity Violation
    # -------------------------------------------------------------------------
    print("\n--- TEST 2: Workflow Verification (Ambiguous Manager Approval) ---")
    t2_text = "Send expensive purchases to the manager for quick approval."
    res2 = await run_full_pipeline(t2_text)
    v2 = res2.verification
    assert v2.passed is False, "Test 2 must FAIL verification gate"
    assert v2.execution_allowed is False, "Test 2 must BLOCK execution"
    assert v2.verification_id is None, "Test 2 must NOT have verification ID"
    assert any("Semantic" in fc for fc in v2.failed_checks), "Test 2 must fail Semantic Analysis"
    print(">>> TEST 2 PASSED [OK]")

    # -------------------------------------------------------------------------
    # TEST 3: Workflow Verification — RBAC Authorization Violation
    # -------------------------------------------------------------------------
    print("\n--- TEST 3: Workflow Verification (RBAC Unauthorized Action) ---")
    t3_text = "Let the Procurement Officer approve the finance request and create the procurement ticket."
    res3 = await run_full_pipeline(t3_text)
    v3 = res3.verification
    assert v3.passed is False, "Test 3 must FAIL verification gate"
    assert v3.execution_allowed is False, "Test 3 must BLOCK execution"
    assert v3.verification_id is None, "Test 3 must NOT have verification ID"
    assert any("RBAC" in fc for fc in v3.failed_checks), "Test 3 must fail RBAC check"
    print(">>> TEST 3 PASSED [OK]")

    # -------------------------------------------------------------------------
    # TEST 4: Workflow Verification — Circular Dependency Topology
    # -------------------------------------------------------------------------
    print("\n--- TEST 4: Workflow Verification (Circular Dependency Topology) ---")
    t4_text = "Budget verification requires finance approval, and finance approval requires the budget to be checked again."
    res4 = await run_full_pipeline(t4_text)
    v4 = res4.verification
    assert v4.passed is False, "Test 4 must FAIL verification gate"
    assert v4.execution_allowed is False, "Test 4 must BLOCK execution"
    assert v4.verification_id is None, "Test 4 must NOT have verification ID"
    assert any("Graph" in fc for fc in v4.failed_checks), "Test 4 must fail Graph Topology check"
    print(">>> TEST 4 PASSED [OK]")

    # -------------------------------------------------------------------------
    # TEST 5: Workflow Verification — Compliance Rule Violation
    # -------------------------------------------------------------------------
    print("\n--- TEST 5: Workflow Verification (Compliance Rule Violation: $25k without Finance) ---")
    t5_text = "Create a procurement ticket for a $25,00,000 purchase without finance approval."
    res5 = await run_full_pipeline(t5_text)
    v5 = res5.verification
    assert v5.passed is False, "Test 5 must FAIL verification gate"
    assert v5.execution_allowed is False, "Test 5 must BLOCK execution"
    assert v5.verification_id is None, "Test 5 must NOT have verification ID"
    assert any("Compliance" in fc for fc in v5.failed_checks), "Test 5 must fail Compliance check"
    print(">>> TEST 5 PASSED [OK]")

    # -------------------------------------------------------------------------
    # TEST 6: SPECIFIC VENDOR TEST 1 — XYZ Innovative Solutions Pvt Ltd (Unknown / Insufficient Evidence)
    # -------------------------------------------------------------------------
    print("\n--- TEST 6: Vendor Verification (XYZ Innovative Solutions Pvt Ltd) ---")
    v_xyz = verify_vendor_signals("XYZ Innovative Solutions Pvt Ltd")
    print(f"Vendor Name: {v_xyz.vendor_name}")
    print(f"Status: {v_xyz.verification_status}")
    print(f"Score: {v_xyz.score_display} (Raw: {v_xyz.score})")
    print(f"Risk: {v_xyz.risk_level}")
    print(f"Decision: {v_xyz.decision}")
    print(f"Summary: {v_xyz.summary}")
    
    # Must NOT assume verified, must NOT return 100/100, must NOT fabricate CIN/GSTIN
    assert v_xyz.verification_status == "INSUFFICIENT_EVIDENCE", "XYZ must have status INSUFFICIENT_EVIDENCE"
    assert v_xyz.score is None, "Score must be None (N/A) for unknown vendor with insufficient evidence"
    assert v_xyz.score_display == "N/A", "Score display must be 'N/A'"
    assert v_xyz.risk_level == "UNKNOWN", "Risk level must be UNKNOWN"
    assert v_xyz.decision == "PROCUREMENT BLOCKED", "Decision must be PROCUREMENT BLOCKED"
    assert all(e.reference_id is None for e in v_xyz.evidence_list), "Must not fabricate reference IDs for unknown vendor"
    print(">>> TEST 6 (XYZ Unknown Vendor) PASSED [OK]")

    # -------------------------------------------------------------------------
    # TEST 7: SPECIFIC VENDOR TEST 2 — Lenovo India (Real Public Authoritative Signals)
    # -------------------------------------------------------------------------
    print("\n--- TEST 7: Vendor Verification (Lenovo India) ---")
    v_lenovo = verify_vendor_signals("Lenovo India")
    print(f"Vendor Name: {v_lenovo.vendor_name}")
    print(f"Status: {v_lenovo.verification_status}")
    print(f"Score: {v_lenovo.score_display}")
    print(f"Risk: {v_lenovo.risk_level}")
    print(f"Decision: {v_lenovo.decision}")
    
    assert v_lenovo.verification_status == "VERIFIED", "Lenovo India must be VERIFIED"
    assert v_lenovo.score == 95, "Lenovo India score must reflect actual evidence signals"
    assert v_lenovo.risk_level == "LOW", "Lenovo India risk must be LOW"
    assert v_lenovo.decision == "ELIGIBLE FOR PROCUREMENT REVIEW", "Must be eligible for review"
    # Check distinct authoritative evidence
    roc_ev = next((e for e in v_lenovo.evidence_list if "Legal Identity" in e.evidence_type), None)
    assert roc_ev is not None and "U72900DL2005PTC133580" in roc_ev.reference_id, "Must verify Delhi ROC CIN"
    gst_ev = next((e for e in v_lenovo.evidence_list if "GSTIN" in e.evidence_type), None)
    assert gst_ev is not None and "07AABCL0123M1Z5" in gst_ev.reference_id, "Must verify Delhi GSTIN"
    print(">>> TEST 7 (Lenovo Authoritative Entity) PASSED [OK]")

    # -------------------------------------------------------------------------
    # TEST 8: SPECIFIC VENDOR TEST 3 — Dell Technologies (Independent Entity Signals)
    # -------------------------------------------------------------------------
    print("\n--- TEST 8: Vendor Verification (Dell Technologies / Dell India) ---")
    v_dell = verify_vendor_signals("Dell Technologies")
    print(f"Vendor Name: {v_dell.vendor_name}")
    print(f"Status: {v_dell.verification_status}")
    print(f"Score: {v_dell.score_display}")
    print(f"Decision: {v_dell.decision}")
    
    assert v_dell.verification_status == "VERIFIED", "Dell must be VERIFIED"
    assert v_dell.score == 95
    # Must use Dell-specific signals, not Lenovo data
    dell_roc = next((e for e in v_dell.evidence_list if "Legal Identity" in e.evidence_type), None)
    assert dell_roc is not None and "U72900KA1996PTC020436" in dell_roc.reference_id, "Must have Bangalore ROC CIN"
    dell_gst = next((e for e in v_dell.evidence_list if "GSTIN" in e.evidence_type), None)
    assert dell_gst is not None and "29AABCD1234M1Z8" in dell_gst.reference_id, "Must have Karnataka GSTIN"
    print(">>> TEST 8 (Dell Independent Entity) PASSED [OK]")

    # -------------------------------------------------------------------------
    # TEST 9: SPECIFIC VENDOR TEST 4 — Missing Vendor Name (Needs Clarification)
    # -------------------------------------------------------------------------
    print("\n--- TEST 9: Vendor Verification (Missing Vendor Name / Needs Clarification) ---")
    incomplete_policy = "Whenever we purchase laptops from a new vendor, verify the vendor and create the purchase order."
    extracted = extract_procurement_request(incomplete_policy)
    print(f"Extracted Vendor: {extracted['vendor_name']}")
    print(f"Missing fields: {extracted['missing_fields']}")
    print(f"Needs Clarification: {extracted['needs_clarification']}")
    
    assert extracted['vendor_name'] is None, "Must not invent or assume a vendor name"
    assert "Vendor Name" in extracted['missing_fields']
    assert extracted['needs_clarification'] is True
    
    v_missing = verify_vendor_signals(extracted['vendor_name'])
    assert v_missing.verification_status == "NEEDS_CLARIFICATION"
    assert v_missing.score is None
    assert v_missing.decision == "PROCUREMENT BLOCKED"
    print(">>> TEST 9 (Missing Vendor Clarification) PASSED [OK]")

    # -------------------------------------------------------------------------
    # TEST 10: Full Procurement Execution with Unverified Vendor (Must BLOCK PO)
    # -------------------------------------------------------------------------
    print("\n--- TEST 10: Execution Gating — XYZ Innovative Solutions Pvt Ltd (Must BLOCK PO) ---")
    t_xyz = "Whenever we purchase 100 Laptops from XYZ Innovative Solutions Pvt Ltd for ₹80,00,000 for the IT department with an available budget of ₹1,20,00,000, verify the vendor, check whether the department has enough budget, obtain Finance approval, and then create the purchase order."
    res_xyz = await run_full_pipeline(t_xyz)
    assert res_xyz.verification.passed is True, "Workflow logic itself passes workflow verification"
    
    # Initialize execution
    ir_xyz = build_ir(await parse_policy(t_xyz))
    wf_id_xyz = f"xyz_wf_{res_xyz.workflow_id}"
    execution_simulator.create_execution(wf_id_xyz, ir_xyz, verification_id=res_xyz.verification.verification_id)
    
    # Step 1: Identify Vendor
    s1_xyz = execution_simulator.advance_execution(wf_id_xyz)
    assert s1_xyz['current_step'] == "identify_vendor"
    
    # Step 2: Verify Vendor (Must reject and stop execution!)
    s2_xyz = execution_simulator.advance_execution(wf_id_xyz)
    print(f"Step 2 Status: {s2_xyz['step_states'].get('verify_vendor')}")
    print(f"Execution Stopped: {s2_xyz['is_stopped']}")
    print(f"Purchase Order Created: {s2_xyz['procurement_context']['purchase_order']}")
    
    assert s2_xyz['step_states']['verify_vendor'] == "rejected", "verify_vendor MUST be rejected for unknown XYZ vendor"
    assert s2_xyz['is_stopped'] is True, "Execution MUST be stopped"
    assert s2_xyz['step_states']['create_purchase_order'] == "locked", "create_purchase_order MUST be locked"
    assert s2_xyz['procurement_context']['purchase_order'] is None, "PO must NOT be created for unverified vendor"
    print(">>> TEST 10 (Execution Blocked for Unverified Vendor) PASSED [OK]")

    # -------------------------------------------------------------------------
    # TEST 11: Full Procurement Execution with Verified Vendor (Lenovo India)
    # -------------------------------------------------------------------------
    print("\n--- TEST 11: Full Procurement Execution (Lenovo India -> Full Flow to PO) ---")
    t_lenovo = "Whenever we purchase 100 Laptops from Lenovo India for ₹80,00,000 for the IT department with an available budget of ₹1,20,00,000, verify the vendor, check whether the department has enough budget, obtain Finance approval, and then create the purchase order."
    res_lenovo = await run_full_pipeline(t_lenovo)
    ir_lenovo = build_ir(await parse_policy(t_lenovo))
    wf_id_lenovo = f"lenovo_wf_{res_lenovo.workflow_id}"
    execution_simulator.create_execution(wf_id_lenovo, ir_lenovo, verification_id=res_lenovo.verification.verification_id)
    
    # Step 1: Identify Vendor
    s1 = execution_simulator.advance_execution(wf_id_lenovo)
    assert s1['current_step'] == "identify_vendor"
    
    # Step 2: Verify Vendor (Passes for Lenovo India)
    s2 = execution_simulator.advance_execution(wf_id_lenovo)
    assert s2['procurement_context']['vendor_assessment']['verification_status'] == "VERIFIED"
    
    # Step 3: Check Budget
    s3 = execution_simulator.advance_execution(wf_id_lenovo)
    assert s3['procurement_context']['budget_validation']['passed'] is True
    
    # Step 4: Finance Approval (Pauses for human sign-off)
    s4 = execution_simulator.advance_execution(wf_id_lenovo)
    assert s4['waiting_approval_step'] is not None
    
    # Step 5: Sign off approval
    s5 = execution_simulator.approve_execution_step(wf_id_lenovo, approved=True, user_role="Finance Manager")
    assert s5['procurement_context']['finance_approval_status'] == "APPROVED"
    
    # Step 6: Create Purchase Order (PO Generated)
    s6 = execution_simulator.advance_execution(wf_id_lenovo)
    po = s6['procurement_context']['purchase_order']
    print(f"Generated Purchase Order: {po['po_number']} issued to {po['vendor_name']}")
    assert po is not None and "PO-VF" in po['po_number']
    assert po['vendor_name'] == "Lenovo India"
    print(">>> TEST 11 (Full Verified Execution to PO) PASSED [OK]")

    # -------------------------------------------------------------------------
    # TEST 12: Step Ordering Verification
    # -------------------------------------------------------------------------
    print("\n--- TEST 12: Step Ordering (Canvas Topological Sequence) ---")
    steps_order = [s.id for s in ir_lenovo.steps]
    print(f"Topological Steps Order: {steps_order}")
    assert steps_order == [
        "identify_vendor",
        "verify_vendor",
        "check_budget",
        "finance_approval",
        "create_purchase_order"
    ], "Steps must strictly follow canonical sequence: Identify -> Verify -> Budget -> Finance -> PO"
    print(">>> TEST 12 (Topological Step Sequence) PASSED [OK]")

    # -------------------------------------------------------------------------
    # TEST 13: Finance Approval Blocked when Workflow Gate is BLOCKED (RBAC Violation)
    # -------------------------------------------------------------------------
    print("\n--- TEST 13: Finance Approval Blocked on Gate BLOCKED (RBAC Violation) ---")
    t13_text = "Let the Procurement Officer approve the finance request and create the procurement ticket."
    res13 = await run_full_pipeline(t13_text)
    assert res13.verification.passed is False, "Workflow Gate must be BLOCKED for RBAC violation"
    assert res13.verification.execution_allowed is False
    assert res13.verification.verification_id is None

    ir13 = build_ir(await parse_policy(t13_text))
    wf_id_13 = f"rbac_blocked_wf_{res13.workflow_id}"
    
    # Attempting to initialize execution with null verification token must raise PermissionError
    try:
        execution_simulator.create_execution(wf_id_13, ir13, verification_id=None)
        assert False, "create_execution MUST raise PermissionError when Workflow Gate is BLOCKED"
    except PermissionError as pe:
        assert "Workflow execution blocked" in str(pe)
        print("✓ Successfully prevented execution initialization on BLOCKED gate")

    # If an execution object were somehow evaluated, finance approval must be LOCKED and BLOCKED
    state13 = execution_simulator.ExecutionState(ir13, verification_id=None)
    res_adv13 = state13.advance()
    assert state13.procurement_context['finance_approval_status'] == "BLOCKED"
    assert state13.is_stopped is True
    print(">>> TEST 13 (Finance Approval Blocked on Gate BLOCKED) PASSED [OK]")

    # -------------------------------------------------------------------------
    # TEST 14: Finance Approval Blocked when Department Budget Exceeded
    # -------------------------------------------------------------------------
    print("\n--- TEST 14: Finance Approval Blocked on Budget Exceeded Deficit ---")
    t14_text = "Whenever we purchase 100 Laptops from HP India for ₹95,00,000 for the IT department with an available budget of ₹40,00,000, verify the vendor, check whether the department has enough budget, obtain Finance approval, and then create the purchase order."
    res14 = await run_full_pipeline(t14_text)
    ir14 = build_ir(await parse_policy(t14_text))
    wf_id_14 = f"budget_over_wf_{res14.workflow_id}"
    
    execution_simulator.create_execution(wf_id_14, ir14, verification_id=res14.verification.verification_id)
    
    # Step 1: Identify Vendor
    execution_simulator.advance_execution(wf_id_14)
    # Step 2: Verify Vendor (Passes for HP India)
    execution_simulator.advance_execution(wf_id_14)
    # Step 3: Check Budget (Must FAIL due to ₹55L deficit!)
    s3_14 = execution_simulator.advance_execution(wf_id_14)
    print(f"Step 3 Status: {s3_14['step_states'].get('check_budget')}")
    print(f"Budget Passed: {s3_14['procurement_context']['budget_validation']['passed']}")
    print(f"Finance Approval Status: {s3_14['procurement_context']['finance_approval_status']}")
    
    assert s3_14['step_states']['check_budget'] == "rejected", "Budget check must be rejected"
    assert s3_14['is_stopped'] is True, "Execution MUST be stopped"
    assert s3_14['procurement_context']['finance_approval_status'] == "BLOCKED", "Finance approval must be strictly BLOCKED"
    assert s3_14['step_states']['finance_approval'] == "locked", "Finance approval must be locked"
    assert s3_14['step_states']['create_purchase_order'] == "locked", "PO creation must be locked"
    
    # Attempting to sign off approval on a blocked workflow must return locked status
    s_app14 = execution_simulator.approve_execution_step(wf_id_14, approved=True, user_role="Finance Manager")
    assert s_app14['procurement_context']['finance_approval_status'] == "BLOCKED"
    assert s_app14['procurement_context']['purchase_order'] is None
    print(">>> TEST 14 (Finance Approval Blocked on Budget Exceeded) PASSED [OK]")

    # -------------------------------------------------------------------------
    # TEST 15: Finance Approval Blocked when Vendor Verification Fails
    # -------------------------------------------------------------------------
    print("\n--- TEST 15: Finance Approval Blocked on Unverified Vendor ---")
    t15_text = "Whenever we purchase 100 Laptops from XYZ Innovative Solutions Pvt Ltd for ₹80,00,000 for the IT department with an available budget of ₹1,20,00,000, verify the vendor, check whether the department has enough budget, obtain Finance approval, and then create the purchase order."
    res15 = await run_full_pipeline(t15_text)
    ir15 = build_ir(await parse_policy(t15_text))
    wf_id_15 = f"vendor_unverified_wf_{res15.workflow_id}"
    
    execution_simulator.create_execution(wf_id_15, ir15, verification_id=res15.verification.verification_id)
    # Step 1: Identify Vendor
    execution_simulator.advance_execution(wf_id_15)
    # Step 2: Verify Vendor (Fails for XYZ)
    s2_15 = execution_simulator.advance_execution(wf_id_15)
    assert s2_15['step_states']['verify_vendor'] == "rejected"
    assert s2_15['procurement_context']['finance_approval_status'] == "BLOCKED"
    assert s2_15['step_states']['finance_approval'] == "locked"
    
    # Attempting to advance or approve must remain locked
    s_app15 = execution_simulator.approve_execution_step(wf_id_15, approved=True, user_role="Finance Manager")
    assert s_app15['procurement_context']['finance_approval_status'] == "BLOCKED"
    assert s_app15['procurement_context']['purchase_order'] is None
    print(">>> TEST 15 (Finance Approval Blocked on Unverified Vendor) PASSED [OK]")

    print("\n================================================================")
    print(" ALL 15 END-TO-END DUAL-LAYER TESTS PASSED SUCCESSFULLY! [OK]")
    print("================================================================")

if __name__ == "__main__":
    asyncio.run(run_tests())
