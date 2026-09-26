# ✦ StaffChain — Decentralized Web3 Employee Registry

[![Solidity](https://img.shields.io/badge/Solidity-%5E0.8.0-363636?logo=solidity)](https://soliditylang.org/)
[![Web3.js](https://img.shields.io/badge/Web3.js-v1.8.2-F16822?logo=javascript)](https://web3js.readthedocs.io/)
[![Truffle](https://img.shields.io/badge/Truffle-Suite-5E464D?logo=ethereum)](https://trufflesuite.com/)
[![MetaMask](https://img.shields.io/badge/MetaMask-Enabled-E2761B?logo=metamask)](https://metamask.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-0F4C3A.svg)](LICENSE)

**StaffChain** is a decentralized, on-chain human resources and employee identity management system built on Ethereum. It provides an immutable, transparent, and cryptographically verifiable registry of institutional personnel with full CRUD (Create, Read, Update, Delete) operations directly executed on a Solidity smart contract.

---

## 🌟 Key Features

- **🔗 100% On-Chain Storage**: Employee credentials (ID, Name, Email, Role/Position) are stored directly inside smart contract state mappings, signed and verified by the registrant's Ethereum address.
- **🦊 Zero-Friction MetaMask Integration**:
  - Automatically detects network configuration.
  - Prompts 1-click network switching or adds the local Ganache network (`http://127.0.0.1:7545`, Chain ID `1337`).
- **💰 Built-in Instant Faucet**:
  - Includes a 1-click **`+ Get 10 Free ETH`** button in the dashboard to top up any connected test account with local gas funds automatically.
- **👤 Interactive Employee Profile Cards**:
  - Click on any employee's name in the directory to inspect their full profile, including permanent transaction hashes and cryptographic timestamps.
- **✏️ On-Chain Role & Name Updates**:
  - Edit and update an employee's title, role, or contact details with a signed Ethereum transaction.
- **🗑️ On-Chain Record Deletion**:
  - Securely remove obsolete records from contract storage using the Solidity swap-and-pop pattern.
- **🎨 Human-Crafted Luxury Aesthetic**:
  - Built with a warm Nordic porcelain and British Racing Pine / Emerald palette with amber accents, completely free of generic AI blue/black tropes.

---

## 🏗️ Architecture & Data Flow

```
┌──────────────────────────────────────────────────────────┐
│                      Client Browser                      │
│                                                          │
│  [ registration.html ]   <─────>   [ MetaMask Wallet ]   │
│   • Enter Name, Role,                • Holds Private Key │
│     Email                            • Signs & Sends Tx  │
│   • Directory Table                  • Manages Nonces    │
└──────────────┬────────────────────────────┬──────────────┘
               │ Web3.js                    │ JSON-RPC (7545 / 8545)
               ▼                            ▼
┌──────────────────────────────────────────────────────────┐
│                   Ganache Blockchain                     │
│                                                          │
│   Smart Contract: [ EmployeeRegistration.sol ]           │
│   • registerEmployee(name, email, position)              │
│   • updateEmployee(id, name, email, position)            │
│   • deleteEmployee(id)                                   │
│   • getEmployee(id) & getAllEmployeeIds()                │
└──────────────────────────────────────────────────────────┘
```

---

## 📋 Smart Contract Specification (`EmployeeRegistration.sol`)

| Function | Type | Description |
| :--- | :--- | :--- |
| `registerEmployee(name, email, position)` | Public (Tx) | Increments caller's employee count, stores data, emits `EmployeeRegistered`. |
| `updateEmployee(id, name, email, position)` | Public (Tx) | Updates an existing employee's name and role, emits `EmployeeUpdated`. |
| `deleteEmployee(id)` | Public (Tx) | Deletes employee struct and removes ID from active array, emits `EmployeeDeleted`. |
| `getEmployee(id)` | View (Call) | Returns `(id, name, email, position)` for the caller's employee ID. |
| `getAllEmployeeIds()` | View (Call) | Returns array of all active employee IDs owned by the caller. |

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MetaMask Browser Extension](https://metamask.io/)

### 1. Install Dependencies
```bash
npm install
```

---

### 2. Start the Local Blockchain (Terminal 1)
Start your local Ganache node:
```bash
npm run ganache
```
> *Keep this terminal running. It starts an Ethereum RPC node on `http://127.0.0.1:7545` (Network ID: `5777`, Chain ID: `1337`).*

---

### 3. Deploy Smart Contracts (Terminal 2)
In a new terminal window, compile and deploy the smart contract to Ganache:
```bash
npm run deploy:ganache
```
This automatically compiles the Solidity contracts, deploys them to Ganache, and syncs the updated ABI file to `src/abis/EmployeeRegistration.json`.

---

### 4. Start the Web Application
```bash
npm run dev
```
The application will launch in your browser at:
👉 **`http://localhost:3000/index.html`** or **`http://localhost:3000/registration.html`**

---

### 5. Configure MetaMask

1. Open your browser and navigate to **`http://localhost:3000/registration.html`**.
2. When prompted:
   - Accept the automatic **"Switch to Ganache Local"** network request.
   - Or add manually in MetaMask:
     - **Network Name**: `Ganache Local`
     - **RPC URL**: `http://127.0.0.1:7545`
     - **Chain ID**: `1337`
     - **Currency Symbol**: `ETH`
3. **Get Free Test ETH**:
   - Click the green **`+ Get 10 Free ETH`** button in the top navigation bar to top up your account instantly!
   - Alternatively, import the Ganache pre-funded account (1,000 ETH) using this test private key:
     ```text
     0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
     ```

---

## 🧪 Running Automated Tests

Run the comprehensive Truffle unit test suite:

```bash
npx truffle test
```

### Test Coverage Summary:
```text
  Contract: EmployeeRegistration
    ✔ should deploy contract successfully
    ✔ should register employee for user1 (User 1)
    ✔ should update employee name and role/position
    ✔ should register a second employee (User 2)
    ✔ should delete an employee and remove from list

  5 passing (800ms)
```

---

## 💡 Troubleshooting

- **MetaMask "Network fee ⚠️" in Red / Disabled Confirm Button**:
  - Your account has 0 ETH. Click the green **`+ Get 10 Free ETH`** button in the header or run `node fund.cjs <your_address>`.
- **"Nonce too high" or transaction pending forever**:
  - Whenever you restart Ganache, reset MetaMask's internal nonce cache:
    - MetaMask ➔ **Settings** ➔ **Advanced** ➔ **Clear activity tab data** (Reset Account).
- **Wrong Network Warning**:
  - Click the **"Switch MetaMask to Ganache Local"** button on the dashboard banner to switch automatically.

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
