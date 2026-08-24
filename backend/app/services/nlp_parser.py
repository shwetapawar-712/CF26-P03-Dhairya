"""
NLP Parser — Google Gemini API integration with robust deterministic fallback parser.

Converts natural-language policy text into structured JSON (ParsedPolicy).
Uses Gemini's structured output mode when API key is available.
Falls back to a pattern-based parser for local execution and preset scenarios.
"""

import json
import re
import logging
from typing import Optional
from app.schemas.workflow import ParsedPolicy, WorkflowStep, Condition, ConditionOperator
from app.config import settings

logger = logging.getLogger(__name__)

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
                    role="Manager",  # Ambiguous — which manager?
                    dependencies=[],
                    approval_required=True,
                    description="Send expensive purchase for approval.",
                    threshold="expensive",  # Ambiguous — unquantified threshold
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
                    role="Procurement Officer",  # RBAC violation — wrong role
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

    # Check for negation phrases regarding finance approval
    has_no_finance_approval = bool(re.search(r'(?:without|no|skip|avoid)\s+(?:finance\s+approval|approval\s+from\s+finance)', text_lower))

    # Action patterns: (step_id, pattern, action_name, default_role, is_approval)
    action_patterns = [
        ("verify_vendor", r"verify\s+(?:the\s+)?vendor|vendor\s+verification", "Verify Vendor", "Procurement Officer", False),
        ("check_budget", r"(?:check|verification)\s+(?:the\s+)?budget|budget\s+verification|budget\s+to\s+be\s+checked", "Check Budget", "Department Head", False),
        ("finance_approval", r"(?:obtain\s+|get\s+)?finance\s+approval|approve\s+(?:the\s+)?finance\s+request", "Finance Approval", "Finance Manager", True),
        ("manager_approval", r"manager\s+(?:review|approval|for\s+quick\s+approval)|quick\s+approval|expensive\s+purchases?", "Quick Approval", "Manager", True),
        ("create_procurement_ticket", r"create\s+(?:the\s+)?(?:procurement\s+)?ticket", "Create Procurement Ticket", "Procurement Officer", False),
        ("process_order", r"process\s+(?:the\s+)?order", "Process Order", "Unspecified", False),
        ("request_purchase", r"request\s+(?:a\s+)?purchase", "Request Purchase", "Department Head", False),
        ("cfo_approval", r"cfo\s+approval|approve\s+by\s+cfo", "CFO Approval", "CFO", True),
    ]

    # Extract threshold if present
    threshold_match = re.search(r'\$[\d,]+', policy_text)
    extracted_threshold = threshold_match.group(0) if threshold_match else None
    if not extracted_threshold and "expensive" in text_lower:
        extracted_threshold = "expensive"

    found_steps = []

    # Identify actions matching patterns
    for step_id, pattern, action_name, default_role, is_approval in action_patterns:
        # Skip finance_approval if explicitly negated
        if step_id == "finance_approval" and has_no_finance_approval:
            continue

        match = re.search(pattern, text_lower)
        if match:
            pos = match.start()
            assigned_role = default_role

            # Specific role assignment overrides based on sentence context
            if "expensive" in text_lower and step_id == "manager_approval":
                assigned_role = "Manager"
            elif "procurement officer" in text_lower and step_id == "finance_approval" and (
                "procurement officer approve" in text_lower or
                "procurement officer should" in text_lower or
                "let the procurement officer" in text_lower
            ):
                assigned_role = "Procurement Officer"

            found_steps.append((pos, step_id, action_name, assigned_role, is_approval))

    # Sort steps by order of appearance in policy text
    found_steps.sort(key=lambda x: x[0])

    # Check for circular dependency patterns (e.g. Scenario 4 text)
    is_circular = "re-check" in text_lower or "budget check after finance approval" in text_lower or (
        "budget" in text_lower and "finance approval" in text_lower and "requires" in text_lower and "again" in text_lower
    )

    steps = []
    for i, (pos, step_id, action_name, role, is_approval) in enumerate(found_steps):
        deps = []

        if is_circular:
            if step_id == "check_budget":
                deps = ["finance_approval"]
            elif step_id == "finance_approval":
                deps = ["check_budget"]
            elif i > 0:
                deps = [found_steps[i - 1][1]]
        elif i > 0:
            deps = [found_steps[i - 1][1]]

        t_val = None
        if extracted_threshold and (step_id in ("check_budget", "manager_approval", "create_procurement_ticket") or extracted_threshold == "expensive"):
            t_val = extracted_threshold

        steps.append(WorkflowStep(
            id=step_id,
            action=action_name,
            role=role,
            dependencies=deps,
            approval_required=is_approval,
            description=f"{action_name} extracted from policy sentence.",
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

    return ParsedPolicy(
        workflow_name="Custom Policy Workflow",
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
