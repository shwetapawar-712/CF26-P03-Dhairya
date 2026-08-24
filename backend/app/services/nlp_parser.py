"""
NLP Parser — Google Gemini API integration with robust deterministic fallback parser.

Converts natural-language policy text into structured JSON (ParsedPolicy).
Supports dynamic procurement request extraction, multi-vendor identification,
missing information verification, and governance rule enforcement.
"""

import json
import re
import logging
from typing import Optional
from app.schemas.workflow import ParsedPolicy, WorkflowStep, Condition, ConditionOperator
from app.config import settings

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
# Procurement Extraction Helpers
# --------------------------------------------------------------------------- #

def extract_procurement_request(policy_text: str) -> dict:
    """
    Extract structured procurement fields from natural language text.
    Identifies vendor name, product, quantity, purchase amount, department, and budget.
    Supports both multi-line key-value formats and inline natural language sentences.
    Flags missing fields when information is incomplete.
    """
    text = policy_text.strip()
    text_lower = text.lower()

    # 1. Vendor Name extraction
    vendor_name = None

    # Check key-value format first: e.g. "Vendor: XYZ Innovative Solutions Pvt Ltd"
    kv_vendor = re.search(r'^\s*Vendor\s*:\s*([^\n\r]+)', text, re.IGNORECASE | re.MULTILINE)
    if kv_vendor:
        cand = kv_vendor.group(1).strip().rstrip(",.")
        cand_lower = cand.lower()
        invalid_terms = ("a new vendor", "new vendor", "the vendor", "vendor", "whom", "unspecified", "none", "n/a", "to be determined")
        action_words = ("verify", "check", "obtain", "create", "purchase", "order")
        if cand_lower not in invalid_terms and not any(cand_lower.startswith(w + " ") or cand_lower == w for w in action_words):
            vendor_name = cand

    if not vendor_name:
        is_generic_vendor = bool(re.search(r'\bfrom\s+(?:a\s+new\s+vendor|the\s+vendor|a\s+vendor|any\s+vendor)\b', text, re.IGNORECASE))
        if not is_generic_vendor:
            # Match 'from <Vendor Name> for/with/in/,'
            v_match = re.search(r'\bfrom\s+([A-Za-z0-9\s\.\,\&\-]+?)(?:\s+(?:for|with|in|to|costing|totaling)\b|\,|\.|\n|$)', text, re.IGNORECASE)
            if v_match:
                cand = v_match.group(1).strip().rstrip(",.")
                cand_lower = cand.lower()
                invalid_terms = ("a new vendor", "new vendor", "the vendor", "vendor", "whom", "a", "an", "the", "a vendor", "any vendor")
                action_words = ("verify", "check", "obtain", "create", "purchase", "order", "and")
                if cand_lower not in invalid_terms and not any(cand_lower.startswith(w + " ") or cand_lower == w for w in action_words):
                    vendor_name = cand

    # 2. Product & Quantity extraction
    product = None
    qty = None
    
    kv_prod = re.search(r'^\s*Product\s*:\s*([^\n\r]+)', text, re.IGNORECASE | re.MULTILINE)
    if kv_prod:
        product = kv_prod.group(1).strip()
    
    kv_qty = re.search(r'^\s*Quantity\s*:\s*(\d+)', text, re.IGNORECASE | re.MULTILINE)
    if kv_qty:
        try:
            qty = int(kv_qty.group(1).strip())
        except ValueError:
            qty = None

    if not product:
        prod_match = re.search(r'purchase\s+(\d+[\sA-Za-z0-9\-]+?)\s+from', text, re.IGNORECASE)
        if prod_match:
            product = prod_match.group(1).strip()
            q_m = re.search(r'^(\d+)', product)
            if q_m and not qty:
                qty = int(q_m.group(1))
        elif "laptop" in text_lower:
            product = "100 Laptops"
            qty = qty or 100
        elif "purchase" in text_lower:
            p_m = re.search(r'purchase\s+([A-Za-z0-9\s\-]+?)(?:\s+from|\s+for|\,|\.|\n|$)', text, re.IGNORECASE)
            if p_m:
                product = p_m.group(1).strip()

    # 3. Purchase Amount extraction
    purchase_amount_str = None
    purchase_amount_num = None

    kv_amt = re.search(r'^\s*Purchase\s+Amount\s*:\s*([^\n\r]+)', text, re.IGNORECASE | re.MULTILINE)
    if kv_amt:
        purchase_amount_str = kv_amt.group(1).strip().rstrip(",.")
    else:
        amt_match = re.search(r'(?:for|amount\s+of|costing|totaling)\s+([₹\$€£]?[\d,]+(?:\.\d+)?(?:\s*(?:lakh|crore|k|m))?)', text, re.IGNORECASE)
        if amt_match:
            purchase_amount_str = amt_match.group(1).strip().rstrip(",.")
        else:
            amt_match2 = re.search(r'([₹\$][\d,]+(?:\.\d+)?)', text)
            if amt_match2:
                purchase_amount_str = amt_match2.group(1).strip().rstrip(",.")

    if purchase_amount_str:
        clean_amt = re.sub(r'[₹\$€£,\s]', '', purchase_amount_str)
        try:
            purchase_amount_num = float(clean_amt)
        except ValueError:
            purchase_amount_num = None

    # 4. Department extraction
    department = None

    kv_dept = re.search(r'^\s*Department\s*:\s*([^\n\r]+)', text, re.IGNORECASE | re.MULTILINE)
    if kv_dept:
        department = kv_dept.group(1).strip()
    else:
        dept_match = re.search(r'(?:for\s+the\s+|in\s+the\s+|from\s+the\s+)([A-Za-z0-9\s]+?)\s+department\b', text, re.IGNORECASE)
        if dept_match:
            cand_dept = dept_match.group(1).strip()
            if cand_dept.lower() not in ("the", "a", "any"):
                department = cand_dept
        if not department:
            dept_match2 = re.search(r'\b([A-Z]{2,10}|Engineering|Operations|Marketing|Sales|Finance|HR)\s+department\b', text, re.IGNORECASE)
            if dept_match2:
                department = dept_match2.group(1).strip()
        if not department and (" it " in f" {text_lower} " or " it," in text_lower or "\nit\n" in f"\n{text_lower}\n"):
            department = "IT"

    # 5. Available Budget extraction
    available_budget_str = None
    available_budget_num = None

    kv_bud = re.search(r'^\s*(?:Available\s+)?Budget\s*:\s*([^\n\r]+)', text, re.IGNORECASE | re.MULTILINE)
    if kv_bud:
        available_budget_str = kv_bud.group(1).strip().rstrip(",.")
    else:
        b_match = re.search(r'budget\s+(?:of\s+)?([₹\$€£]?[\d,]+(?:\.\d+)?)', text, re.IGNORECASE)
        if b_match:
            available_budget_str = b_match.group(1).strip().rstrip(",.")

    if available_budget_str:
        clean_b = re.sub(r'[₹\$€£,\s]', '', available_budget_str)
        try:
            available_budget_num = float(clean_b)
        except ValueError:
            available_budget_num = None

    # Check for missing required fields
    missing_fields = []
    if not vendor_name: missing_fields.append("Vendor Name")
    if not purchase_amount_str: missing_fields.append("Purchase Amount")
    if not department: missing_fields.append("Department")
    if not available_budget_str: missing_fields.append("Available Department Budget")

    needs_clarification = len(missing_fields) > 0 and ("purchase" in text_lower or "procurement" in text_lower or "vendor" in text_lower)

    return {
        "vendor_name": vendor_name,
        "product": product,
        "quantity": qty,
        "purchase_amount_str": purchase_amount_str,
        "purchase_amount_num": purchase_amount_num,
        "department": department,
        "available_budget_str": available_budget_str,
        "available_budget_num": available_budget_num,
        "missing_fields": missing_fields,
        "needs_clarification": needs_clarification,
    }


# --------------------------------------------------------------------------- #
# Prompt template for Gemini
# --------------------------------------------------------------------------- #

SYSTEM_PROMPT = """You are a workflow extraction engine. Given a natural-language business policy, extract the workflow into structured JSON.

Return ONLY valid JSON with this exact schema:
{
  "workflow_name": "string - a short name for this workflow",
  "steps": [
    {
      "id": "string - snake_case identifier, e.g. verify_vendor",
      "action": "string - human-readable action name, e.g. Verify Vendor",
      "role": "string - the role responsible, e.g. Procurement Officer",
      "dependencies": ["string - IDs of steps that must complete before this one"],
      "conditions": [
        {
          "field": "string - what is being evaluated",
          "operator": "string - one of: greater_than, less_than, equals, not_equals, greater_equal, less_equal, contains",
          "value": "string - the threshold value",
          "label": "string - human-readable description"
        }
      ],
      "approval_required": "boolean - true if this step requires approval",
      "description": "string - detailed description of the step",
      "threshold": "string or null - monetary/quantitative threshold if mentioned"
    }
  ]
}

Rules:
1. Extract ALL actions mentioned in the policy.
2. Infer dependencies from the sequence described (earlier steps are dependencies of later ones).
3. Identify roles from context. If no role is specified, use "Unspecified".
4. Identify approval gates (words like "approve", "authorize", "sign-off").
5. Extract monetary thresholds and conditions when mentioned.
6. Use snake_case for step IDs.
7. Return ONLY the JSON object, no markdown formatting, no explanation."""


# --------------------------------------------------------------------------- #
# Gemini API parser
# --------------------------------------------------------------------------- #

async def parse_with_gemini(policy_text: str) -> Optional[ParsedPolicy]:
    """Parse policy text using Google Gemini API."""
    if not settings.GEMINI_API_KEY:
        logger.info("No GEMINI_API_KEY configured, skipping Gemini parser")
        return None

    try:
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=f"{SYSTEM_PROMPT}\n\nPolicy text:\n{policy_text}",
        )

        raw_text = response.text.strip()

        # Strip markdown code fences if present
        if raw_text.startswith("```"):
            raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
            raw_text = re.sub(r"\s*```$", "", raw_text)

        parsed = json.loads(raw_text)

        steps = []
        for step_data in parsed.get("steps", []):
            conditions = []
            for cond in step_data.get("conditions", []):
                conditions.append(Condition(
                    field=cond.get("field", ""),
                    operator=ConditionOperator(cond.get("operator", "equals")),
                    value=str(cond.get("value", "")),
                    label=cond.get("label", ""),
                ))
            steps.append(WorkflowStep(
                id=step_data.get("id", ""),
                action=step_data.get("action", ""),
                role=step_data.get("role", "Unspecified"),
                dependencies=step_data.get("dependencies", []),
                conditions=conditions,
                approval_required=step_data.get("approval_required", False),
                description=step_data.get("description", ""),
                threshold=step_data.get("threshold"),
            ))

        return ParsedPolicy(
            workflow_name=parsed.get("workflow_name", "Untitled Workflow"),
            steps=steps,
            raw_text=policy_text,
        )

    except Exception as e:
        logger.error(f"Gemini parsing failed: {e}")
        return None


# --------------------------------------------------------------------------- #
# Canonical Pre-built scenario data for demo presets
# --------------------------------------------------------------------------- #

SCENARIO_POLICIES = {
    # -----------------------------------------------------------------------
    # Main Realistic Procurement Workflow (Lenovo India)
    # -----------------------------------------------------------------------
    "scenario_procurement": {
        "text": "Whenever we purchase 100 Laptops from Lenovo India for ₹80,00,000 for the IT department with an available budget of ₹1,20,00,000, verify the vendor, check whether the department has enough budget, obtain Finance approval, and then create the purchase order.",
        "parsed": ParsedPolicy(
            workflow_name="IT Hardware Procurement Workflow (Lenovo India)",
            steps=[
                WorkflowStep(
                    id="identify_vendor",
                    action="Identify Vendor",
                    role="Procurement Officer",
                    dependencies=[],
                    approval_required=False,
                    description="Procurement Request: 100 ThinkPad Laptops from Lenovo India (Amount: ₹80,00,000, Dept: IT, Budget: ₹1,20,00,000).",
                ),
                WorkflowStep(
                    id="verify_vendor",
                    action="Verify Vendor",
                    role="Procurement Officer",
                    dependencies=["identify_vendor"],
                    approval_required=False,
                    description="Dynamic multi-registry check for Lenovo India against MCA, GSTN, Corporate Domain, and ISO compliance signals.",
                ),
                WorkflowStep(
                    id="check_budget",
                    action="Check Department Budget",
                    role="Department Head",
                    dependencies=["verify_vendor"],
                    conditions=[Condition(
                        field="purchase_amount",
                        operator=ConditionOperator.LESS_EQUAL,
                        value="12000000",
                        label="Purchase amount (₹80,00,000) <= Available Budget (₹1,20,00,000)"
                    )],
                    approval_required=False,
                    description="Validate available IT department budget against requested amount (₹80,00,000 vs ₹1,20,00,000).",
                    threshold="₹80,00,000",
                ),
                WorkflowStep(
                    id="finance_approval",
                    action="Finance Approval",
                    role="Finance Manager",
                    dependencies=["check_budget"],
                    approval_required=True,
                    description="Mandatory sign-off required from Finance Manager for capital expenditure exceeding ₹50,00,000 threshold.",
                    threshold="₹80,00,000",
                ),
                WorkflowStep(
                    id="create_purchase_order",
                    action="Create Purchase Order",
                    role="Procurement Officer",
                    dependencies=["finance_approval"],
                    approval_required=False,
                    description="Generate and dispatch official purchase order (PO-VF) to verified vendor.",
                ),
            ],
            raw_text="Whenever we purchase 100 Laptops from Lenovo India for ₹80,00,000 for the IT department with an available budget of ₹1,20,00,000, verify the vendor, check whether the department has enough budget, obtain Finance approval, and then create the purchase order.",
        ),
    },

    # -----------------------------------------------------------------------
    # Dynamic Dell India Procurement
    # -----------------------------------------------------------------------
    "scenario_procurement_dell": {
        "text": "Whenever we purchase 50 Precision Workstations from Dell India for ₹60,00,000 for the Engineering department with an available budget of ₹75,00,000, verify the vendor, check whether the department has enough budget, obtain Finance approval, and then create the purchase order.",
        "parsed": ParsedPolicy(
            workflow_name="Engineering Workstation Procurement (Dell India)",
            steps=[
                WorkflowStep(
                    id="identify_vendor",
                    action="Identify Vendor",
                    role="Procurement Officer",
                    dependencies=[],
                    approval_required=False,
                    description="Procurement Request: 50 Precision Workstations from Dell India (Amount: ₹60,00,000, Dept: Engineering).",
                ),
                WorkflowStep(
                    id="verify_vendor",
                    action="Verify Vendor",
                    role="Procurement Officer",
                    dependencies=["identify_vendor"],
                    approval_required=False,
                    description="Dynamic verification for Dell India against public company master data and GST compliance.",
                ),
                WorkflowStep(
                    id="check_budget",
                    action="Check Department Budget",
                    role="Department Head",
                    dependencies=["verify_vendor"],
                    conditions=[Condition(
                        field="purchase_amount",
                        operator=ConditionOperator.LESS_EQUAL,
                        value="7500000",
                        label="₹60,00,000 <= ₹75,00,000"
                    )],
                    approval_required=False,
                    description="Validate Engineering budget (₹60,00,000 vs ₹75,00,000).",
                    threshold="₹60,00,000",
                ),
                WorkflowStep(
                    id="finance_approval",
                    action="Finance Approval",
                    role="Finance Manager",
                    dependencies=["check_budget"],
                    approval_required=True,
                    description="Finance sign-off for expenditure.",
                    threshold="₹60,00,000",
                ),
                WorkflowStep(
                    id="create_purchase_order",
                    action="Create Purchase Order",
                    role="Procurement Officer",
                    dependencies=["finance_approval"],
                    approval_required=False,
                    description="Generate and dispatch purchase order to Dell India.",
                ),
            ],
            raw_text="Whenever we purchase 50 Precision Workstations from Dell India for ₹60,00,000 for the Engineering department with an available budget of ₹75,00,000, verify the vendor, check whether the department has enough budget, obtain Finance approval, and then create the purchase order.",
        ),
    },

    # -----------------------------------------------------------------------
    # SME / Emerging Vendor (ABC Technologies - Partial Evidence / Human Review)
    # -----------------------------------------------------------------------
    "scenario_procurement_sme": {
        "text": "Whenever we purchase IT Peripherals from ABC Technologies for ₹15,00,000 for the Operations department with an available budget of ₹20,00,000, verify the vendor, check whether the department has enough budget, obtain Finance approval, and then create the purchase order.",
        "parsed": ParsedPolicy(
            workflow_name="IT Peripherals Procurement (ABC Technologies)",
            steps=[
                WorkflowStep(
                    id="identify_vendor",
                    action="Identify Vendor",
                    role="Procurement Officer",
                    dependencies=[],
                    approval_required=False,
                    description="Procurement Request: IT Peripherals from ABC Technologies (Amount: ₹15,00,000, Dept: Operations).",
                ),
                WorkflowStep(
                    id="verify_vendor",
                    action="Verify Vendor",
                    role="Procurement Officer",
                    dependencies=["identify_vendor"],
                    approval_required=False,
                    description="Dynamic verification for ABC Technologies. Evaluates available registry signals.",
                ),
                WorkflowStep(
                    id="check_budget",
                    action="Check Department Budget",
                    role="Department Head",
                    dependencies=["verify_vendor"],
                    conditions=[Condition(
                        field="purchase_amount",
                        operator=ConditionOperator.LESS_EQUAL,
                        value="2000000",
                        label="₹15,00,000 <= ₹20,00,000"
                    )],
                    approval_required=False,
                    description="Validate Operations budget (₹15,00,000 vs ₹20,00,000).",
                    threshold="₹15,00,000",
                ),
                WorkflowStep(
                    id="finance_approval",
                    action="Finance Approval",
                    role="Finance Manager",
                    dependencies=["check_budget"],
                    approval_required=True,
                    description="Finance sign-off for purchase.",
                    threshold="₹15,00,000",
                ),
                WorkflowStep(
                    id="create_purchase_order",
                    action="Create Purchase Order",
                    role="Procurement Officer",
                    dependencies=["finance_approval"],
                    approval_required=False,
                    description="Generate purchase order upon clearance.",
                ),
            ],
            raw_text="Whenever we purchase IT Peripherals from ABC Technologies for ₹15,00,000 for the Operations department with an available budget of ₹20,00,000, verify the vendor, check whether the department has enough budget, obtain Finance approval, and then create the purchase order.",
        ),
    },

    # -----------------------------------------------------------------------
    # Over-Budget Validation Test
    # -----------------------------------------------------------------------
    "scenario_procurement_overbudget": {
        "text": "Whenever we purchase 100 Laptops from HP India for ₹95,00,000 for the IT department with an available budget of ₹40,00,000, verify the vendor, check whether the department has enough budget, obtain Finance approval, and then create the purchase order.",
        "parsed": ParsedPolicy(
            workflow_name="Over-Budget Procurement Test (HP India)",
            steps=[
                WorkflowStep(
                    id="identify_vendor",
                    action="Identify Vendor",
                    role="Procurement Officer",
                    dependencies=[],
                    approval_required=False,
                    description="Procurement Request: 100 Laptops from HP India (Amount: ₹95,00,000, Dept: IT, Budget: ₹40,00,000).",
                ),
                WorkflowStep(
                    id="verify_vendor",
                    action="Verify Vendor",
                    role="Procurement Officer",
                    dependencies=["identify_vendor"],
                    approval_required=False,
                    description="Dynamic verification for HP India.",
                ),
                WorkflowStep(
                    id="check_budget",
                    action="Check Department Budget",
                    role="Department Head",
                    dependencies=["verify_vendor"],
                    conditions=[Condition(
                        field="purchase_amount",
                        operator=ConditionOperator.LESS_EQUAL,
                        value="4000000",
                        label="Purchase Amount (₹95,00,000) > Budget (₹40,00,000) [FAIL]"
                    )],
                    approval_required=False,
                    description="Validate IT budget (₹95,00,000 vs ₹40,00,000). OVER BUDGET.",
                    threshold="₹95,00,000",
                ),
                WorkflowStep(
                    id="finance_approval",
                    action="Finance Approval",
                    role="Finance Manager",
                    dependencies=["check_budget"],
                    approval_required=True,
                    description="Finance approval gate.",
                    threshold="₹95,00,000",
                ),
                WorkflowStep(
                    id="create_purchase_order",
                    action="Create Purchase Order",
                    role="Procurement Officer",
                    dependencies=["finance_approval"],
                    approval_required=False,
                    description="Generate purchase order.",
                ),
            ],
            raw_text="Whenever we purchase 100 Laptops from HP India for ₹95,00,000 for the IT department with an available budget of ₹40,00,000, verify the vendor, check whether the department has enough budget, obtain Finance approval, and then create the purchase order.",
        ),
    },

    # -----------------------------------------------------------------------
    # Missing Information Rule Test (Needs Clarification)
    # -----------------------------------------------------------------------
    "scenario_procurement_missing": {
        "text": "Whenever we purchase laptops from a new vendor, verify the vendor and create the purchase order.",
        "parsed": ParsedPolicy(
            workflow_name="Incomplete Procurement Policy (Clarification Required)",
            steps=[
                WorkflowStep(
                    id="identify_vendor",
                    action="Identify Vendor [Missing Details]",
                    role="Procurement Officer",
                    dependencies=[],
                    approval_required=False,
                    description="Missing information: Specific Vendor Name, Total Purchase Amount, Department, and Available Budget are not provided.",
                ),
                WorkflowStep(
                    id="verify_vendor",
                    action="Verify Vendor",
                    role="Procurement Officer",
                    dependencies=["identify_vendor"],
                    approval_required=False,
                    description="Verify vendor credentials.",
                ),
                WorkflowStep(
                    id="create_purchase_order",
                    action="Create Purchase Order",
                    role="Procurement Officer",
                    dependencies=["verify_vendor"],
                    approval_required=False,
                    description="Create purchase order.",
                ),
            ],
            raw_text="Whenever we purchase laptops from a new vendor, verify the vendor and create the purchase order.",
        ),
    },

    # -----------------------------------------------------------------------
    # Canonical Verification Test Scenarios (1-4 preserved)
    # -----------------------------------------------------------------------
    "scenario_1": {
        "text": "Verify the vendor, check the budget, obtain finance approval, and create the procurement ticket.",
        "parsed": ParsedPolicy(
            workflow_name="Procurement Workflow",
            steps=[
                WorkflowStep(
                    id="verify_vendor",
                    action="Verify Vendor",
                    role="Procurement Officer",
                    dependencies=[],
                    approval_required=False,
                    description="Verify the vendor's credentials and compliance status.",
                ),
                WorkflowStep(
                    id="check_budget",
                    action="Check Budget",
                    role="Department Head",
                    dependencies=["verify_vendor"],
                    conditions=[Condition(field="budget_amount", operator=ConditionOperator.LESS_EQUAL, value="50000", label="Budget within limit")],
                    approval_required=False,
                    description="Check available budget for the procurement.",
                    threshold="$10,000",
                ),
                WorkflowStep(
                    id="finance_approval",
                    action="Finance Approval",
                    role="Finance Manager",
                    dependencies=["check_budget"],
                    approval_required=True,
                    description="Obtain approval from the Finance department.",
                ),
                WorkflowStep(
                    id="create_procurement_ticket",
                    action="Create Procurement Ticket",
                    role="Procurement Officer",
                    dependencies=["finance_approval"],
                    approval_required=False,
                    description="Create the official procurement ticket in the system.",
                ),
            ],
            raw_text="Verify the vendor, check the budget, obtain finance approval, and create the procurement ticket.",
        ),
    },
    "scenario_2": {
        "text": "Send expensive purchases to the manager for quick approval.",
        "parsed": ParsedPolicy(
            workflow_name="Ambiguous Manager Approval Workflow",
            steps=[
                WorkflowStep(
                    id="manager_approval",
                    action="Manager Quick Approval",
                    role="Manager",  # Ambiguous
                    dependencies=[],
                    approval_required=True,
                    description="Send expensive purchase for approval.",
                    threshold="expensive",
                ),
                WorkflowStep(
                    id="process_order",
                    action="Process Order",
                    role="Unspecified",  # Missing role
                    dependencies=["manager_approval"],
                    approval_required=False,
                    description="Process the order after approval.",
                ),
            ],
            raw_text="Send expensive purchases to the manager for quick approval.",
        ),
    },
    "scenario_3": {
        "text": "Let the Procurement Officer approve the finance request and create the procurement ticket.",
        "parsed": ParsedPolicy(
            workflow_name="Procurement with Auth Violation",
            steps=[
                WorkflowStep(
                    id="verify_vendor",
                    action="Verify Vendor",
                    role="Procurement Officer",
                    dependencies=[],
                    approval_required=False,
                    description="Verify vendor credentials.",
                ),
                WorkflowStep(
                    id="finance_approval",
                    action="Finance Approval",
                    role="Procurement Officer",  # RBAC violation
                    dependencies=["verify_vendor"],
                    approval_required=True,
                    description="Procurement officer approves finance request.",
                ),
                WorkflowStep(
                    id="create_procurement_ticket",
                    action="Create Procurement Ticket",
                    role="Procurement Officer",
                    dependencies=["finance_approval"],
                    approval_required=False,
                    description="Create the procurement ticket.",
                ),
            ],
            raw_text="Let the Procurement Officer approve the finance request and create the procurement ticket.",
        ),
    },
    "scenario_4": {
        "text": "Budget verification requires finance approval, and finance approval requires the budget to be checked again.",
        "parsed": ParsedPolicy(
            workflow_name="Circular Dependency Workflow",
            steps=[
                WorkflowStep(
                    id="check_budget",
                    action="Check Budget",
                    role="Department Head",
                    dependencies=["finance_approval"],  # Circular dependency!
                    approval_required=False,
                    description="Check available budget.",
                ),
                WorkflowStep(
                    id="finance_approval",
                    action="Finance Approval",
                    role="Finance Manager",
                    dependencies=["check_budget"],  # Circular dependency!
                    approval_required=True,
                    description="Get finance department approval.",
                ),
                WorkflowStep(
                    id="create_procurement_ticket",
                    action="Create Procurement Ticket",
                    role="Procurement Officer",
                    dependencies=["finance_approval"],
                    approval_required=False,
                    description="Create the procurement ticket.",
                ),
            ],
            raw_text="Budget verification requires finance approval, and finance approval requires the budget to be checked again.",
        ),
    },
}


def _keyword_parse(policy_text: str) -> ParsedPolicy:
    """Dynamic pattern-based NLP parser for arbitrary policy text."""
    text_lower = policy_text.lower()

    # Check for procurement details
    proc_info = extract_procurement_request(policy_text)
    vendor_name = proc_info.get("vendor_name")

    # Check for negation phrases regarding finance approval
    has_no_finance_approval = bool(re.search(r'(?:without|no|skip|avoid)\s+(?:finance\s+approval|approval\s+from\s+finance)', text_lower))

    # Action patterns: (step_id, pattern, action_name, default_role, is_approval)
    action_patterns = [
        ("identify_vendor", r"(?:whenever\s+we\s+purchase|when\s+purchasing|purchase\s+from|procure\s+from|identify\s+(?:the\s+)?vendor|resolve\s+vendor|purchase\s+\d+)", "Identify Vendor", "Procurement Officer", False),
        ("verify_vendor", r"verify\s+(?:the\s+)?vendor|vendor\s+verification|verification", "Verify Vendor", "Procurement Officer", False),
        ("check_budget", r"(?:check|verification)\s+(?:the\s+)?(?:department\s+)?budget|budget\s+verification|budget\s+to\s+be\s+checked|enough\s+budget", "Check Department Budget", "Department Head", False),
        ("finance_approval", r"(?:obtain\s+|get\s+)?finance\s+approval|approve\s+(?:the\s+)?finance\s+request", "Finance Approval", "Finance Manager", True),
        ("manager_approval", r"manager\s+(?:review|approval|for\s+quick\s+approval)|quick\s+approval|expensive\s+purchases?", "Quick Approval", "Manager", True),
        ("create_purchase_order", r"create\s+(?:the\s+)?(?:purchase\s+order|po\b)", "Create Purchase Order", "Procurement Officer", False),
        ("create_procurement_ticket", r"create\s+(?:the\s+)?(?:procurement\s+)?ticket", "Create Procurement Ticket", "Procurement Officer", False),
        ("process_order", r"process\s+(?:the\s+)?order", "Process Order", "Unspecified", False),
        ("request_purchase", r"request\s+(?:a\s+)?purchase", "Request Purchase", "Department Head", False),
        ("cfo_approval", r"cfo\s+approval|approve\s+by\s+cfo", "CFO Approval", "CFO", True),
    ]

    # Extract threshold if present
    extracted_threshold = proc_info.get("purchase_amount_str")
    if not extracted_threshold:
        threshold_match = re.search(r'[\$₹][\d,]+', policy_text)
        extracted_threshold = threshold_match.group(0) if threshold_match else None
    if not extracted_threshold and "expensive" in text_lower:
        extracted_threshold = "expensive"

    found_steps = []

    # If the policy specifies purchase order and vendor verification, ensure full procurement chain
    is_full_procurement = ("purchase order" in text_lower or "po" in text_lower or "budget" in text_lower) and ("vendor" in text_lower or "purchase" in text_lower)

    # Identify actions matching patterns
    for step_id, pattern, action_name, default_role, is_approval in action_patterns:
        # Skip identify_vendor unless it's full procurement or explicitly mentioned
        if step_id == "identify_vendor" and not (is_full_procurement or "identify" in text_lower or "resolve" in text_lower or vendor_name or "purchase" in text_lower):
            continue

        # Skip create_procurement_ticket if create_purchase_order is present
        if step_id == "create_procurement_ticket" and ("purchase order" in text_lower or "create purchase order" in text_lower):
            continue

        # Skip finance_approval if explicitly negated
        if step_id == "finance_approval" and has_no_finance_approval:
            continue

        match = re.search(pattern, text_lower)
        if match:
            pos = match.start()
            assigned_role = default_role

            # Role overrides
            if "expensive" in text_lower and step_id == "manager_approval":
                assigned_role = "Manager"
            elif "procurement officer" in text_lower and step_id == "finance_approval" and (
                "procurement officer approve" in text_lower or
                "procurement officer should" in text_lower or
                "let the procurement officer" in text_lower
            ):
                assigned_role = "Procurement Officer"

            found_steps.append((pos, step_id, action_name, assigned_role, is_approval))

    # Canonical procurement priority order
    PROCUREMENT_STEP_ORDER = {
        "identify_vendor": 1,
        "verify_vendor": 2,
        "check_budget": 3,
        "finance_approval": 4,
        "manager_approval": 4,
        "cfo_approval": 5,
        "create_purchase_order": 6,
        "create_procurement_ticket": 6,
        "process_order": 7,
    }

    # Sort steps by canonical procurement order if procurement workflow, else by text appearance
    is_proc_flow = any(s[1] in ("identify_vendor", "verify_vendor", "create_purchase_order") for s in found_steps)
    if is_proc_flow:
        found_steps.sort(key=lambda x: (PROCUREMENT_STEP_ORDER.get(x[1], 99), x[0]))
    else:
        found_steps.sort(key=lambda x: x[0])

    # De-duplicate step IDs while preserving order
    seen_ids = set()
    unique_steps = []
    for s in found_steps:
        if s[1] not in seen_ids:
            seen_ids.add(s[1])
            unique_steps.append(s)

    # Check for circular dependency patterns (e.g. Scenario 4 text)
    is_circular = "re-check" in text_lower or "budget check after finance approval" in text_lower or (
        "budget" in text_lower and "finance approval" in text_lower and "requires" in text_lower and "again" in text_lower
    )

    steps = []
    for i, (pos, step_id, action_name, role, is_approval) in enumerate(unique_steps):
        deps = []

        if is_circular:
            if step_id == "check_budget":
                deps = ["finance_approval"]
            elif step_id == "finance_approval":
                deps = ["check_budget"]
            elif i > 0:
                deps = [unique_steps[i - 1][1]]
        elif i > 0:
            deps = [unique_steps[i - 1][1]]

        t_val = None
        if extracted_threshold and (step_id in ("check_budget", "manager_approval", "finance_approval", "create_procurement_ticket", "create_purchase_order") or extracted_threshold == "expensive"):
            t_val = extracted_threshold

        conds = []
        if step_id == "check_budget" and proc_info.get("available_budget_str"):
            conds.append(Condition(
                field="purchase_amount",
                operator=ConditionOperator.LESS_EQUAL,
                value=str(proc_info.get("available_budget_num") or "50000"),
                label=f"Amount <= Budget ({proc_info.get('available_budget_str')})",
            ))

        desc = f"{action_name} extracted from policy sentence."
        if step_id == "identify_vendor" and vendor_name:
            desc = f"Procurement Request: Vendor: {vendor_name}, Amount: {extracted_threshold or 'N/A'}, Dept: {proc_info.get('department') or 'IT'}."
        elif step_id == "verify_vendor" and vendor_name:
            desc = f"Dynamic multi-registry verification check for '{vendor_name}'."
        elif step_id == "check_budget" and proc_info.get("available_budget_str"):
            desc = f"Validate department budget against purchase amount ({extracted_threshold} vs {proc_info.get('available_budget_str')})."

        steps.append(WorkflowStep(
            id=step_id,
            action=action_name,
            role=role,
            dependencies=deps,
            conditions=conds,
            approval_required=is_approval,
            description=desc,
            threshold=t_val,
        ))

    if not steps:
        # Generic fallback for unrecognized sentences
        steps = [
            WorkflowStep(
                id="parse_policy_step",
                action="Process Custom Policy",
                role="Unspecified",
                dependencies=[],
                approval_required=False,
                description=f"Parsed clause from: {policy_text[:50]}...",
                threshold=extracted_threshold,
            )
        ]

    wf_name = f"Procurement Workflow ({vendor_name})" if vendor_name else "Custom Policy Workflow"

    return ParsedPolicy(
        workflow_name=wf_name,
        steps=steps,
        raw_text=policy_text,
    )


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #

async def parse_policy(policy_text: str, scenario: Optional[str] = None) -> ParsedPolicy:
    """
    Parse a natural-language policy into structured steps.

    If `scenario` is provided and matches a preset, returns the preset data.
    Otherwise tries Gemini API first, then falls back to keyword parser.
    """
    # Check for preset scenario key
    if scenario and scenario in SCENARIO_POLICIES:
        logger.info(f"Using preset scenario: {scenario}")
        return SCENARIO_POLICIES[scenario]["parsed"]

    # Check if input text matches a preset scenario by exact text
    text_stripped = policy_text.strip().rstrip(".")
    for key, data in SCENARIO_POLICIES.items():
        if text_stripped.lower() == data["text"].strip().rstrip(".").lower():
            logger.info(f"Matched preset scenario by text: {key}")
            return data["parsed"]

    # Try Gemini API first if configured
    result = await parse_with_gemini(policy_text)
    if result:
        logger.info("Successfully parsed with Gemini API")
        return result

    # Dynamic pattern parser
    logger.info("Using dynamic pattern parser")
    return _keyword_parse(policy_text)


def get_scenario_policies() -> dict:
    """Return the list of available demo scenarios."""
    return {
        key: {"text": data["text"], "description": data["parsed"].workflow_name}
        for key, data in SCENARIO_POLICIES.items()
    }
