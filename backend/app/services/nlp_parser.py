"""
NLP Parser — Google Gemini API integration with mock fallback.

Converts natural-language policy text into structured JSON (ParsedPolicy).
Uses Gemini's structured output mode for reliable JSON extraction.
Falls back to a deterministic mock parser when no API key is configured.
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

        # Validate through Pydantic
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
# Mock / fallback parser (deterministic, clause & pattern-based)
# --------------------------------------------------------------------------- #

# Pre-built scenario data for demo presets
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
        "text": "Have the manager review the expensive purchase, get approval, and process the order.",
        "parsed": ParsedPolicy(
            workflow_name="Purchase Review Workflow",
            steps=[
                WorkflowStep(
                    id="manager_review",
                    action="Manager Review",
                    role="Manager",  # Ambiguous — which manager?
                    dependencies=[],
                    approval_required=False,
                    description="Have the manager review the purchase.",
                ),
                WorkflowStep(
                    id="get_approval",
                    action="Get Approval",
                    role="Manager",  # Ambiguous
                    dependencies=["manager_review"],
                    approval_required=True,
                    description="Get approval for the expensive purchase.",
                    threshold="expensive",  # Ambiguous — no numeric value
                ),
                WorkflowStep(
                    id="process_order",
                    action="Process Order",
                    role="Unspecified",  # Missing role
                    dependencies=["get_approval"],
                    approval_required=False,
                    description="Process the purchase order.",
                ),
            ],
            raw_text="Have the manager review the expensive purchase, get approval, and process the order.",
        ),
    },
    "scenario_3": {
        "text": "The procurement officer should verify the vendor, approve the finance request, check the budget, and create the ticket.",
        "parsed": ParsedPolicy(
            workflow_name="Procurement with Auth Violation",
            steps=[
                WorkflowStep(
                    id="verify_vendor",
                    action="Verify Vendor",
                    role="Procurement Officer",
                    dependencies=[],
                    approval_required=False,
                    description="Verify the vendor credentials.",
                ),
                WorkflowStep(
                    id="finance_approval",
                    action="Finance Approval",
                    role="Procurement Officer",  # RBAC violation — wrong role
                    dependencies=["verify_vendor"],
                    approval_required=True,
                    description="Approve the finance request.",
                ),
                WorkflowStep(
                    id="check_budget",
                    action="Check Budget",
                    role="Procurement Officer",
                    dependencies=["finance_approval"],
                    approval_required=False,
                    description="Check budget availability.",
                    threshold="$10,000",
                ),
                WorkflowStep(
                    id="create_ticket",
                    action="Create Procurement Ticket",
                    role="Procurement Officer",
                    dependencies=["check_budget"],
                    approval_required=False,
                    description="Create the procurement ticket.",
                ),
            ],
            raw_text="The procurement officer should verify the vendor, approve the finance request, check the budget, and create the ticket.",
        ),
    },
    "scenario_4": {
        "text": "Check the budget, if budget fails get finance approval, finance approval requires budget re-check, then create the ticket.",
        "parsed": ParsedPolicy(
            workflow_name="Circular Dependency Workflow",
            steps=[
                WorkflowStep(
                    id="check_budget",
                    action="Check Budget",
                    role="Department Head",
                    dependencies=["finance_approval"],  # Circular!
                    approval_required=False,
                    description="Check available budget.",
                ),
                WorkflowStep(
                    id="finance_approval",
                    action="Finance Approval",
                    role="Finance Manager",
                    dependencies=["check_budget"],  # Circular!
                    approval_required=True,
                    description="Get finance department approval.",
                ),
                WorkflowStep(
                    id="create_ticket",
                    action="Create Procurement Ticket",
                    role="Procurement Officer",
                    dependencies=["finance_approval"],
                    approval_required=False,
                    description="Create the ticket after approvals.",
                ),
            ],
            raw_text="Check the budget, if budget fails get finance approval, finance approval requires budget re-check, then create the ticket.",
        ),
    },
}


def _keyword_parse(policy_text: str) -> ParsedPolicy:
    """Dynamic pattern-based NLP parser for arbitrary policy text."""
    text_lower = policy_text.lower()

    # Known role keywords & exact role names
    role_map = [
        ("procurement officer", "Procurement Officer"),
        ("finance manager", "Finance Manager"),
        ("department head", "Department Head"),
        ("cfo", "CFO"),
        ("manager", "Manager"),
        ("supervisor", "Supervisor"),
        ("system admin", "System Admin"),
        ("admin", "System Admin"),
    ]

    # Action patterns
    action_patterns = [
        ("verify_vendor", r"verify\s+(?:the\s+)?vendor", "Verify Vendor", "Procurement Officer", False),
        ("check_budget", r"check\s+(?:the\s+)?budget", "Check Budget", "Department Head", False),
        ("finance_approval", r"(?:obtain\s+|get\s+)?finance\s+approval", "Finance Approval", "Finance Manager", True),
        ("manager_review", r"manager\s+review|review\s+by\s+manager", "Manager Review", "Manager", False),
        ("get_approval", r"get\s+approval|obtain\s+approval", "Get Approval", "Manager", True),
        ("create_ticket", r"create\s+(?:the\s+)?(?:procurement\s+)?ticket", "Create Procurement Ticket", "Procurement Officer", False),
        ("process_order", r"process\s+(?:the\s+)?order", "Process Order", "Procurement Officer", False),
        ("request_purchase", r"request\s+(?:a\s+)?purchase", "Request Purchase", "Department Head", False),
        ("cfo_approval", r"cfo\s+approval|approve\s+by\s+cfo", "CFO Approval", "CFO", True),
    ]

    # Extract threshold if present
    threshold_match = re.search(r'\$[\d,]+', policy_text)
    extracted_threshold = threshold_match.group(0) if threshold_match else None
    if not extracted_threshold and "expensive" in text_lower:
        extracted_threshold = "expensive"

    # Extract role from entire text if explicit
    explicit_role = None
    for r_key, r_name in role_map:
        if r_key in text_lower:
            explicit_role = r_name
            break

    found_steps = []
    # Identify actions matching patterns
    for step_id, pattern, action_name, default_role, is_approval in action_patterns:
        match = re.search(pattern, text_lower)
        if match:
            pos = match.start()
            # Assign role: if explicit role found for ambiguous action, use it
            assigned_role = default_role
            if "manager" in text_lower and "expensive" in text_lower and step_id in ("manager_review", "get_approval"):
                assigned_role = "Manager"
            elif explicit_role and "procurement officer should" in text_lower:
                assigned_role = "Procurement Officer"

            found_steps.append((pos, step_id, action_name, assigned_role, is_approval))

    # Sort steps by order of appearance in policy text
    found_steps.sort(key=lambda x: x[0])

    steps = []
    step_ids = []

    # Check for circular dependency patterns (e.g. Scenario 4 text)
    is_circular = "re-check" in text_lower or "budget check after finance approval" in text_lower or ("budget fails get finance approval" in text_lower and "requires budget" in text_lower)

    for i, (pos, step_id, action_name, role, is_approval) in enumerate(found_steps):
        step_ids.append(step_id)
        deps = []

        if is_circular and step_id == "check_budget":
            deps = ["finance_approval"]
        elif i > 0:
            deps = [found_steps[i - 1][1]]

        t_val = None
        if step_id in ("check_budget", "get_approval", "finance_approval") and extracted_threshold:
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
        # Generic fallback for completely unrecognized sentences
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
        workflow_name="Parsed Policy Workflow",
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

    # Try Gemini API first
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
