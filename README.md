# VeriFlow

### Natural Language to Verified Workflow Compiler

**Hackathon Problem:** P-03 — Natural Language to Verified Workflow Compiler

VeriFlow is an intelligent workflow verification platform that converts natural-language business policies into structured and executable workflows, verifies them against business and authorization rules, and allows execution only when the workflow passes verification.

> **Core Principle:** AI proposes the workflow; the verification engine decides whether it is safe to execute.

---

## 🚀 Problem Statement

Organizations describe business processes in natural language, for example:

> "Verify the vendor, check the budget, obtain finance approval, and create the procurement ticket."

Humans can understand these instructions, but software requires explicit structure, dependencies, authorization, and validation before safely executing them.

VeriFlow converts natural-language policies into verified workflow graphs and prevents ambiguous, unauthorized, or non-compliant workflows from executing.

---

## 💡 Solution

VeriFlow follows a compiler-like pipeline:

```text
Natural Language Policy
        ↓
    LLM / NLP
        ↓
Intermediate Representation (IR)
        ↓
   Workflow Graph
        ↓
 Verification Engine
        ↓
  Verification Gate
      ↙       ↘
   PASS       BLOCK
    ↓           ↓
 Execute      Explain
```

### Example

If vendor verification is required:

```text
Vendor Verification
        ↓
 Finance Approval
        ↓
   Procurement
```

If the vendor cannot be reliably verified, the workflow is blocked:

```text
Vendor Verification ❌
        ↓
Finance Approval ❌
        ↓
Procurement ❌
```

This prevents dependent actions from being incorrectly executed.

---

## ⚙️ Core Technical Mechanism

### Intermediate Representation (IR)

The IR acts as the structured bridge between natural language and workflow execution.

It represents:

* Actions
* Roles
* Conditions
* Dependencies
* Authorization requirements

### Workflow Graph

The IR is converted into a directed workflow graph.

* **Nodes** → Workflow actions/states
* **Edges** → Dependencies and transitions

**NetworkX** is used for graph representation and analysis.

### Verification Engine

Before execution, the generated workflow is checked for:

* Required policy steps
* Approval requirements
* Role and authorization constraints
* Missing information
* Invalid dependencies
* Circular states
* Unreachable states
* Verification failures

### Verification Gate

Only verified workflows are allowed to execute.

```text
PASS  → Execute
FAIL  → Block + Explain
```

---

## 🛠️ Technology Stack

| Layer                  | Technology                             |
| ---------------------- | -------------------------------------- |
| Frontend               | React, Vite, Tailwind CSS              |
| Workflow Visualization | React Flow                             |
| Backend                | Python, FastAPI                        |
| AI / NLP               | LLM-based Policy Understanding         |
| Graph Processing       | NetworkX                               |
| Authentication         | Firebase Authentication                |
| Database               | Cloud Firestore                        |
| Verification           | Deterministic Rule / Compliance Engine |
| External Data          | Trusted Online Sources / APIs          |

---

## 🔐 Authentication & Authorization

VeriFlow uses **Firebase Authentication** for user identity and role-based application permissions.

### Business User

* Create and compile workflows
* Run verification
* View workflow history
* Execute permitted workflows

### Admin

* Manage compliance rules
* Access administrative functionality
* Review advanced audit information

> Users cannot simply select the `ADMIN` role during signup.

---

## 💾 Data Persistence

User-specific data is associated with the authenticated Firebase UID.

```text
users/{uid}/
├── profile
├── workflows
├── verifications
└── requests
```

This allows users to log out and later continue with their previously saved workflows and verification history.

---

## 🧪 Validation & Results

The prototype is tested against scenarios such as:

| Scenario                                 | Expected Result          |
| ---------------------------------------- | ------------------------ |
| Valid workflow                           | ✅ Execute                |
| Missing required approval                | ❌ Block                  |
| Ambiguous policy                         | ⚠️ Require clarification |
| Circular workflow                        | ❌ Block                  |
| Unreachable state                        | ❌ Block                  |
| Unknown / insufficiently verified vendor | ❌ Block                  |
| Unauthorized action                      | ❌ Block                  |

VeriFlow also provides human-readable explanations for verification failures.

---

## 📊 Key Innovation

Traditional automation focuses on:

> **Execute the workflow.**

VeriFlow focuses on:

> **Verify the workflow before executing it.**

The separation between AI-based workflow generation and deterministic verification reduces the risk of blindly executing incorrect or unsafe AI-generated workflows.

---

## ⚠️ Limitations

* External verification depends on source availability and reliability.
* LLM interpretation may require clarification for highly ambiguous policies.
* Online information alone does not guarantee legal or financial legitimacy.
* Current execution is a prototype/simulation rather than a complete enterprise procurement system.
* Production deployment would require stronger enterprise security and integrations.

---

## 🔮 Future Scope

* Official business/vendor registry integrations
* Advanced vendor risk scoring
* Document-based vendor verification
* Enterprise SSO and fine-grained RBAC
* Human-in-the-loop review queues
* Policy versioning
* Real-time vendor monitoring
* Enterprise workflow integrations
* Multi-tenant deployment

---

## ⚙️ Setup & Installation

### Prerequisites

* Python 3.x
* Node.js & npm
* Firebase project
* Required LLM/API credentials

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Configure the required Firebase and API credentials using environment variables.

> **Security:** Never commit API keys, passwords, service-account files, or other secrets to the repository.

---

## 👥 Team Members

| Name         | Role      |
| ------------ | --------- |
| Shweta Pawar | Developer |
| Member Name  | Role      |
| Member Name  | Role      |
| Member Name  | Role      |

---

## 🤖 AI Assistance Disclosure

AI-assisted development tools were used for code assistance, debugging, architecture brainstorming, UI development, and documentation.

The team reviewed, integrated, tested, and validated the resulting implementation. Final architecture and implementation decisions were made by the team.

---

## 📌 Project Status

**Working Prototype — CodeForge 2026**

VeriFlow demonstrates the complete core concept:

```text
Natural Language
       ↓
      IR
       ↓
Workflow Graph
       ↓
 Verification
       ↓
 Verification Gate
      ↙     ↘
 Execute   Block
```

### VeriFlow — Generate → Verify → Execute.
