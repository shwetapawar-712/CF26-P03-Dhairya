"""
End-to-End Verification Gate & Security Test Suite.
Tests all 5 problem-statement scenarios + security gating.
"""

import asyncio
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from app.services.verification_gate import run_full_pipeline, run_verification_gate, validate_verification_token
from app.services.nlp_parser import parse_policy
from app.services.ir_builder import build_ir
from app.services import execution_simulator

async def run_tests():
    print("================================================================")
    print(" RUNNING END-TO-END VERIFICATION GATE TEST SUITE")
    print("================================================================")
    
    # -------------------------------------------------------------------------
    # TEST 1: Valid Procurement Workflow
    # -------------------------------------------------------------------------
    print("\n--- TEST 1: Valid Procurement Workflow ---")
    t1_text = "Verify the vendor, check the budget, obtain finance approval, and create the procurement ticket."
    res1 = await run_full_pipeline(t1_text)
    v1 = res1.verification
    print(f"Passed: {v1.passed}")
    print(f"Execution Allowed: {v1.execution_allowed}")
    print(f"Verification ID: {v1.verification_id}")
    print(f"Score: {v1.score} | Risk: {v1.risk_level}")
    print(f"Passed Checks: {v1.passed_checks}")
    print(f"Failed Checks: {v1.failed_checks}")
    print(f"Warnings/Violations: {[(v.check_type, v.severity, v.problem) for v in v1.violations]}")
    assert v1.passed is True, "Test 1 must PASS verification gate"
    assert v1.execution_allowed is True, "Test 1 must allow execution"
    assert v1.verification_id is not None, "Test 1 must have a verification ID"
    assert len(v1.failed_checks) == 0, "Test 1 must have 0 failed checks"
    print(">>> TEST 1 PASSED [OK]")

    # -------------------------------------------------------------------------
    # TEST 2: Ambiguous Purchase Approval
    # -------------------------------------------------------------------------
    print("\n--- TEST 2: Ambiguous Purchase Approval ---")
    t2_text = "Send expensive purchases to the manager for quick approval."
    res2 = await run_full_pipeline(t2_text)
    v2 = res2.verification
    print(f"Passed: {v2.passed}")
    print(f"Execution Allowed: {v2.execution_allowed}")
    print(f"Verification ID: {v2.verification_id}")
    print(f"Score: {v2.score} | Risk: {v2.risk_level}")
    print(f"Failed Checks: {v2.failed_checks}")
    print(f"Violations: {[v.problem for v in v2.violations]}")
    assert v2.passed is False, "Test 2 must FAIL verification gate"
    assert v2.execution_allowed is False, "Test 2 must BLOCK execution"
    assert v2.verification_id is None, "Test 2 must NOT have verification ID"
    assert any("Semantic" in fc for fc in v2.failed_checks), "Test 2 must fail Semantic Analysis"
    print(">>> TEST 2 PASSED [OK]")

    # -------------------------------------------------------------------------
    # TEST 3: RBAC Unauthorized Workflow
    # -------------------------------------------------------------------------
    print("\n--- TEST 3: RBAC Unauthorized Action ---")
    t3_text = "Let the Procurement Officer approve the finance request and create the procurement ticket."
    res3 = await run_full_pipeline(t3_text)
    v3 = res3.verification
    print(f"Passed: {v3.passed}")
    print(f"Execution Allowed: {v3.execution_allowed}")
    print(f"Verification ID: {v3.verification_id}")
    print(f"Score: {v3.score} | Risk: {v3.risk_level}")
    print(f"Failed Checks: {v3.failed_checks}")
    print(f"Violations: {[v.problem for v in v3.violations]}")
    assert v3.passed is False, "Test 3 must FAIL verification gate"
    assert v3.execution_allowed is False, "Test 3 must BLOCK execution"
    assert v3.verification_id is None, "Test 3 must NOT have verification ID"
    assert any("RBAC" in fc for fc in v3.failed_checks), "Test 3 must fail RBAC check"
    print(">>> TEST 3 PASSED [OK]")

    # -------------------------------------------------------------------------
    # TEST 4: Circular Dependency Topology
    # -------------------------------------------------------------------------
    print("\n--- TEST 4: Circular Dependency Topology ---")
    t4_text = "Budget verification requires finance approval, and finance approval requires the budget to be checked again."
    res4 = await run_full_pipeline(t4_text)
    v4 = res4.verification
    print(f"Passed: {v4.passed}")
    print(f"Execution Allowed: {v4.execution_allowed}")
    print(f"Verification ID: {v4.verification_id}")
    print(f"Score: {v4.score} | Risk: {v4.risk_level}")
    print(f"Failed Checks: {v4.failed_checks}")
    print(f"Violations: {[v.problem for v in v4.violations]}")
    assert v4.passed is False, "Test 4 must FAIL verification gate"
    assert v4.execution_allowed is False, "Test 4 must BLOCK execution"
    assert v4.verification_id is None, "Test 4 must NOT have verification ID"
    assert any("Graph" in fc for fc in v4.failed_checks), "Test 4 must fail Graph Topology check"
    print(">>> TEST 4 PASSED [OK]")

    # -------------------------------------------------------------------------
    # TEST 5: Compliance Rule Violation ($25k without Finance Approval)
    # -------------------------------------------------------------------------
    print("\n--- TEST 5: Compliance Rule Violation ($25k purchase without finance approval) ---")
    t5_text = "Create a procurement ticket for a $25,000 purchase without finance approval."
    res5 = await run_full_pipeline(t5_text)
    v5 = res5.verification
    print(f"Passed: {v5.passed}")
    print(f"Execution Allowed: {v5.execution_allowed}")
    print(f"Verification ID: {v5.verification_id}")
    print(f"Score: {v5.score} | Risk: {v5.risk_level}")
    print(f"Failed Checks: {v5.failed_checks}")
    print(f"Violations: {[v.problem for v in v5.violations]}")
    assert v5.passed is False, "Test 5 must FAIL verification gate"
    assert v5.execution_allowed is False, "Test 5 must BLOCK execution"
    assert v5.verification_id is None, "Test 5 must NOT have verification ID"
    assert any("Compliance" in fc for fc in v5.failed_checks), "Test 5 must fail Compliance check"
    print(">>> TEST 5 PASSED [OK]")

    # -------------------------------------------------------------------------
    # TEST 6: Execution Security Gating (Verify Before Execute)
    # -------------------------------------------------------------------------
    print("\n--- TEST 6: Execution Security Gating ---")
    ir_valid = build_ir(await parse_policy(t1_text))
    ir_invalid = build_ir(await parse_policy(t3_text))

    # A) Attempt to initialize execution with an unverified invalid IR
    try:
        execution_simulator.create_execution("test_unverified", ir_invalid)
        assert False, "Execution of unverified invalid IR MUST raise PermissionError"
    except PermissionError as pe:
        print(f"[OK] Security Enforcement confirmed: {pe}")

    # B) Execute verified valid IR
    state = execution_simulator.create_execution(res1.workflow_id, ir_valid, verification_id=v1.verification_id)
    assert state is not None, "Verified IR must create execution state"
    print(f"[OK] Execution state successfully initialized for verified workflow (Total steps: {state['progress']['total']})")
    
    step_res = execution_simulator.advance_execution(res1.workflow_id)
    print(f"[OK] Step advanced: {step_res.get('current_step')}")

    print("\n================================================================")
    print(" ALL 6 END-TO-END VERIFICATION TESTS PASSED SUCCESSFULLY! [OK]")
    print("================================================================")

if __name__ == "__main__":
    asyncio.run(run_tests())
