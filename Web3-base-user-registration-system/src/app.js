App = {
  web3Provider: null,
  contracts: {},
  account: null,
  employeesData: {},
  _listenersAttached: false,

  init: async function () {
    if (document.getElementById('connectWalletButton')) {
      return App.initLandingPage();
    } else if (document.getElementById('disconnectButton')) {
      return App.initRegistrationPage();
    }
  },

  initLandingPage: function () {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask is not installed. Please install MetaMask to use this Web3 application.');
      return;
    }
    const connectBtn = document.getElementById('connectWalletButton');
    if (connectBtn) {
      connectBtn.addEventListener('click', App.connectWallet);
    }
  },

  connectWallet: async function () {
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        window.location.href = 'registration.html';
      } catch (error) {
        console.error('User denied account access', error);
        alert('Wallet connection was rejected. Please approve the MetaMask request to continue.');
      }
    } else {
      alert('MetaMask not detected. Please install MetaMask to use this application.');
    }
  },

  initRegistrationPage: async function () {
    if (!window.ethereum) {
      alert('MetaMask not detected. Please install MetaMask to use this application.');
      window.location.href = 'index.html';
      return;
    }

    App.web3Provider = window.ethereum;
    App.initWeb3();
    App.setupListeners();

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length === 0) {
        window.location.href = 'index.html';
        return;
      }
      App.account = accounts[0];

      // Setup disconnect button
      const disconnectBtn = document.getElementById('disconnectButton');
      if (disconnectBtn) {
        disconnectBtn.addEventListener('click', App.disconnectWallet);
      }

      // Setup switch network button in banner if available
      const switchBtn = document.getElementById('switchNetworkBtn');
      if (switchBtn) {
        switchBtn.addEventListener('click', App.switchToGanache);
      }

      const contractLoaded = await App.initContract();
      if (!contractLoaded) {
        const accEl = document.getElementById('account');
        if (accEl) {
          accEl.innerText = 'Connected: ' + App.account.slice(0, 6) + '...' + App.account.slice(-4);
          accEl.title = App.account;
        }
        return;
      }

      await App.render();
    } catch (error) {
      console.error('Error initializing registration page:', error);
      const msg = error.message || String(error);
      if (!msg.includes('RPC endpoint') && !msg.includes('Failed to fetch') && !msg.includes('circuit breaker')) {
        alert('Failed to load application: ' + msg);
      }
    }
  },

  switchToGanache: async function () {
    if (!window.ethereum) return;
    const chainIdHex = '0x539'; // 1337 in hex
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
      window.location.reload();
    } catch (switchError) {
      // 4902: Chain has not been added to MetaMask
      if (switchError.code === 4902 || (switchError.message && switchError.message.includes('Unrecognized'))) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: chainIdHex,
                chainName: 'Ganache Local',
                rpcUrls: ['http://127.0.0.1:7545'],
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18,
                },
              },
            ],
          });
          window.location.reload();
        } catch (addError) {
          console.error('Failed to add Ganache network to MetaMask:', addError);
          alert('Could not add Ganache network automatically. Please verify Ganache is running on port 7545 and add manually:\nRPC URL: http://127.0.0.1:7545\nChain ID: 1337');
        }
      } else {
        console.error('Failed to switch network:', switchError);
      }
    }
  },

  initWeb3: function () {
    window.web3 = new Web3(App.web3Provider);
  },

  initContract: async function () {
    const networkAlert = document.getElementById('networkAlert');
    const networkAlertText = document.getElementById('networkAlertText');

    try {
      const response = await fetch('abis/EmployeeRegistration.json');
      if (!response.ok) {
        throw new Error('Failed to load contract ABI. Make sure you ran "npm run deploy:ganache" first.');
      }
      const EmployeeRegistrationArtifact = await response.json();

      let networkId = null;
      try {
        if (window.ethereum && window.ethereum.chainId) {
          networkId = parseInt(window.ethereum.chainId, 16);
        } else if (window.ethereum) {
          const hex = await window.ethereum.request({ method: 'eth_chainId' });
          networkId = parseInt(hex, 16);
        }
      } catch (chainErr) {
        console.warn('Could not read chainId from window.ethereum:', chainErr);
      }

      if (!networkId && window.web3 && web3.eth) {
        try {
          const rawNetworkId = await web3.eth.net.getId();
          networkId = Number(rawNetworkId);
        } catch (netErr) {
          console.warn('web3.eth.net.getId fallback warning:', netErr);
        }
      }

      console.log('Connected to network ID:', networkId);
      const deployedNetworks = EmployeeRegistrationArtifact.networks || {};
      console.log('Available deployed networks in artifact:', Object.keys(deployedNetworks));

      // 1. Direct match with current network ID
      let deployedNetwork = networkId ? (deployedNetworks[networkId] || deployedNetworks[String(networkId)]) : null;

      // 2. Alias resolution for local testnets (Ganache chainId 1337 <-> networkId 5777 <-> Hardhat 31337)
      if (!deployedNetwork && (networkId === 1337 || networkId === 5777 || networkId === 31337 || !networkId)) {
        deployedNetwork = deployedNetworks['5777'] || deployedNetworks['1337'] || deployedNetworks['31337'];
      }

      // 3. Fallback: use first available deployed address if running on localhost
      if (!deployedNetwork && Object.keys(deployedNetworks).length > 0) {
        const firstKey = Object.keys(deployedNetworks)[0];
        deployedNetwork = deployedNetworks[firstKey];
      }

      if (deployedNetwork && deployedNetwork.address) {
        App.contracts.EmployeeRegistration = new web3.eth.Contract(
          EmployeeRegistrationArtifact.abi,
          deployedNetwork.address
        );
        console.log('Contract loaded successfully at address:', deployedNetwork.address);
        if (networkAlert) networkAlert.style.display = 'none';
        return true;
      } else {
        const availableNetworks = Object.keys(deployedNetworks).join(', ');
        if (networkAlert) {
          networkAlert.style.display = 'block';
          if (networkAlertText) {
            networkAlertText.innerText =
              `MetaMask is currently on Network ID ${networkId || 'Unknown'}. The contract is deployed on local Ganache (${availableNetworks || '5777 / 1337'}). ` +
              `Please switch MetaMask to Ganache Local (http://127.0.0.1:7545, Chain ID: 1337).`;
          }
        }
        return false;
      }
    } catch (error) {
      console.error('initContract error:', error);
      const errMsg = error.message || String(error);
      const isRpcError = errMsg.includes('RPC endpoint') || errMsg.includes('Failed to fetch') || errMsg.includes('connection error') || errMsg.includes('circuit breaker');

      if (networkAlert) {
        networkAlert.style.display = 'block';
        if (networkAlertText) {
          if (isRpcError) {
            networkAlertText.innerHTML = `
              <strong>Local Blockchain RPC Connection Issue:</strong><br>
              MetaMask is currently unable to reach your RPC endpoint (<code>http://127.0.0.1:7545</code>).<br>
              Make sure Ganache is running (run <code>npm run node</code> or <code>npm run dev:all</code>) and refresh.
            `;
          } else {
            networkAlertText.innerText = 'Smart Contract load warning: ' + errMsg;
          }
        }
      } else {
        console.warn('Contract initialization error:', errMsg);
      }
      return false;
    }
  },

  render: async function () {
    const accEl = document.getElementById('account');
    if (accEl) {
      accEl.innerText = 'Connected: ' + App.account.slice(0, 6) + '...' + App.account.slice(-4);
      accEl.title = App.account;
    }

    const faucetBtn = document.getElementById('faucetButton');
    if (faucetBtn) {
      faucetBtn.onclick = async function () {
        faucetBtn.disabled = true;
        faucetBtn.textContent = 'Sending 10 ETH...';
        await App.requestFaucetFunds(App.account);
        await App.updateBalance();
        faucetBtn.disabled = false;
        faucetBtn.textContent = '+ Get 10 Free ETH';
      };
    }

    await App.updateBalance();

    const regForm = document.getElementById('registrationForm');
    if (regForm) {
      regForm.onsubmit = App.registerEmployee;
    }

    await App.loadEmployees();
  },

  updateBalance: async function () {
    if (!App.account) return;
    try {
      const balanceWei = await web3.eth.getBalance(App.account);
      const balanceEth = parseFloat(web3.utils.fromWei(balanceWei, 'ether')).toFixed(3);

      const balEl = document.getElementById('accountBalance');
      if (balEl) {
        balEl.innerText = balanceEth + ' ETH';
        balEl.style.display = 'inline-block';
      }

      // If user has less than 0.05 ETH, auto-fund them with 10 ETH so transactions never fail
      if (parseFloat(balanceEth) < 0.05) {
        console.log('Balance low (' + balanceEth + ' ETH), requesting 10 ETH from local faucet...');
        await App.requestFaucetFunds(App.account);
        const newWei = await web3.eth.getBalance(App.account);
        const newEth = parseFloat(web3.utils.fromWei(newWei, 'ether')).toFixed(3);
        if (balEl) {
          balEl.innerText = newEth + ' ETH';
        }
      }
    } catch (e) {
      console.warn('Could not read balance:', e);
    }
  },

  requestFaucetFunds: async function (targetAccount) {
    const ports = ['7545', '8545'];
    for (const port of ports) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_accounts',
            params: [],
            id: 1,
          }),
        });
        const data = await res.json();
        const unlocked = data.result?.[0];
        if (unlocked) {
          await fetch(`http://127.0.0.1:${port}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_sendTransaction',
              params: [
                {
                  from: unlocked,
                  to: targetAccount,
                  value: '0x8ac7230489e80000', // 10 ETH
                },
              ],
              id: 2,
            }),
          });
          console.log(`Successfully sent 10 ETH from ${unlocked} to ${targetAccount}`);
          return true;
        }
      } catch (err) {
        // try next port
      }
    }
    return false;
  },

  registerEmployee: async function (event) {
    if (event) event.preventDefault();

    // Guard: contract must be loaded
    if (!App.contracts.EmployeeRegistration) {
      alert('Contract is not loaded. Please switch MetaMask to the Ganache Local network.');
      return;
    }

    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const positionInput = document.getElementById('position');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const position = positionInput.value.trim();

    if (!name || !email || !position) {
      alert('Please fill in all fields (Name, Email, Position).');
      return;
    }

    const submitBtn = document.querySelector('#registrationForm button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Please confirm in MetaMask...';
    }

    try {
      const instance = App.contracts.EmployeeRegistration;

      instance.methods
        .registerEmployee(name, email, position)
        .send({ from: App.account, gas: 300000 })
        .on('transactionHash', function (hash) {
          console.log('Transaction sent! Hash:', hash);
          if (submitBtn) {
            submitBtn.textContent = 'Mining transaction...';
          }
        })
        .on('receipt', async function (receipt) {
          console.log('Transaction confirmed! Receipt:', receipt);
          alert('Employee registered successfully on the blockchain!');

          if (nameInput) nameInput.value = '';
          if (emailInput) emailInput.value = '';
          if (positionInput) positionInput.value = '';

          await App.updateBalance();
          await App.loadEmployees();

          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register';
          }
        })
        .on('error', function (error) {
          console.error('Transaction error:', error);
          const msg = error.message || JSON.stringify(error);
          if (msg.includes('User denied') || msg.includes('user rejected')) {
            alert('Transaction was rejected in MetaMask. Please approve the MetaMask prompt to complete registration.');
          } else {
            alert('Transaction failed: ' + msg);
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register';
          }
        });
    } catch (error) {
      console.error('registerEmployee submission error:', error);
      alert('Error submitting transaction: ' + (error.message || error));
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register';
      }
    }
  },

  loadEmployees: async function () {
    if (!App.contracts.EmployeeRegistration || !App.account) {
      console.warn('Contract not loaded or account missing — skipping loadEmployees.');
      return;
    }

    const tableBody = document.getElementById('employeesTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    App.employeesData = {};

    try {
      const instance = App.contracts.EmployeeRegistration;

      // 1. Gather tx hashes from past events if available
      const txHashMap = {};
      try {
        const events = await instance.getPastEvents('EmployeeRegistered', {
          fromBlock: 0,
          toBlock: 'latest',
        });
        if (Array.isArray(events)) {
          events.forEach((ev) => {
            if (ev.returnValues && ev.returnValues.id) {
              txHashMap[String(ev.returnValues.id)] = ev.transactionHash;
            }
          });
        }
      } catch (evErr) {
        console.warn('Past events query note (reading contract storage directly):', evErr);
      }

      // 2. Fetch employee IDs directly from contract state
      const ids = await instance.methods.getAllEmployeeIds().call({ from: App.account });
      console.log('Loaded employee IDs for current account:', ids);

      const totalCountEl = document.getElementById('totalStaffCount');
      if (totalCountEl) totalCountEl.innerText = ids ? ids.length : 0;

      if (ids && ids.length > 0) {
        for (let i = 0; i < ids.length; i++) {
          const empId = ids[i];
          const empData = await instance.methods.getEmployee(empId).call({ from: App.account });
          const employee = {
            id: String(empData[0] || empId),
            name: empData[1],
            email: empData[2],
            position: empData[3],
            txHash: txHashMap[String(empId)] || 'Confirmed On-Chain',
          };
          App.employeesData[employee.id] = employee;
          App.addEmployeeToTable(employee);
        }
      } else {
        const emptyRow = document.createElement('tr');
        emptyRow.id = 'noEmployeesRow';
        emptyRow.innerHTML = '<td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2.5rem 1rem;">No employees registered yet. Use the form on the left to register your first staff member!</td>';
        tableBody.appendChild(emptyRow);
      }
    } catch (error) {
      console.error('loadEmployees error:', error);
      const emptyRow = document.createElement('tr');
      emptyRow.id = 'noEmployeesRow';
      emptyRow.innerHTML = '<td colspan="6" style="text-align: center; color: var(--danger); padding: 2rem 1rem;">⚠️ Unable to query blockchain ledger. Please verify Ganache is running on port 7545.</td>';
      tableBody.appendChild(emptyRow);
    }
  },

  addEmployeeToTable: function (employee) {
    const tableBody = document.getElementById('employeesTableBody');
    if (!tableBody) return;

    const emptyRow = document.getElementById('noEmployeesRow');
    if (emptyRow) emptyRow.remove();

    const row = document.createElement('tr');
    row.id = 'employee-row-' + employee.id;

    // 1. Transaction Hash
    const txHashCell = document.createElement('td');
    if (employee.txHash && employee.txHash.startsWith('0x')) {
      const shortHash = employee.txHash.slice(0, 8) + '...' + employee.txHash.slice(-6);
      txHashCell.innerHTML = `<a href="#" class="tx-link" title="${employee.txHash}" onclick="App.viewTransactionDetails('${employee.txHash}'); return false;">${shortHash}</a>`;
    } else {
      txHashCell.innerHTML = `<span style="color: var(--accent-primary); font-weight: 600; font-size: 0.8rem;">On-Chain</span>`;
    }
    row.appendChild(txHashCell);

    // 2. ID Badge
    const idCell = document.createElement('td');
    idCell.innerHTML = `<span class="id-badge">#${employee.id}</span>`;
    row.appendChild(idCell);

    // 3. Name with Initials Avatar
    const nameCell = document.createElement('td');
    const initials = employee.name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'ST';

    nameCell.innerHTML = `
      <div class="user-cell">
        <div class="user-avatar">${initials}</div>
        <div>
          <a href="#" class="name-link" title="Click to view full record of ${employee.name}" onclick="App.openDetailsModal('${employee.id}'); return false;">${employee.name}</a>
          <div style="font-size: 0.75rem; color: var(--text-muted);">View Profile ↗</div>
        </div>
      </div>
    `;
    row.appendChild(nameCell);

    // 4. Email
    const emailCell = document.createElement('td');
    emailCell.innerText = employee.email;
    emailCell.style.color = 'var(--text-secondary)';
    row.appendChild(emailCell);

    // 5. Position / Role
    const positionCell = document.createElement('td');
    positionCell.innerHTML = `<span style="font-weight: 600; color: var(--text-primary);">${employee.position}</span>`;
    row.appendChild(positionCell);

    // 6. Actions (Edit & Delete)
    const actionsCell = document.createElement('td');
    actionsCell.style.whiteSpace = 'nowrap';
    actionsCell.innerHTML = `
      <div class="action-group">
        <button type="button" class="btn-action-edit" onclick="App.openEditModal('${employee.id}')">✏️ Edit</button>
        <button type="button" class="btn-action-delete" onclick="App.deleteEmployee('${employee.id}')">🗑️ Delete</button>
      </div>
    `;
    row.appendChild(actionsCell);

    tableBody.appendChild(row);
  },

  openDetailsModal: function (id) {
    const emp = App.employeesData[id];
    if (!emp) return;

    document.getElementById('detailId').innerText = '#' + emp.id;
    document.getElementById('detailName').innerText = emp.name;
    document.getElementById('detailPosition').innerText = emp.position;
    document.getElementById('detailEmail').innerText = emp.email;
    document.getElementById('detailTxHash').innerText = emp.txHash || 'Stored on Local Ganache Blockchain';

    const editBtn = document.getElementById('detailEditBtn');
    if (editBtn) {
      editBtn.onclick = function () {
        App.openEditModal(id);
      };
    }

    const modal = document.getElementById('detailsModal');
    if (modal) modal.style.display = 'flex';
  },

  closeDetailsModal: function () {
    const modal = document.getElementById('detailsModal');
    if (modal) modal.style.display = 'none';
  },

  openEditModal: function (id) {
    App.closeDetailsModal();
    const emp = App.employeesData[id];
    if (!emp) return;

    document.getElementById('editEmployeeId').value = emp.id;
    document.getElementById('editName').value = emp.name;
    document.getElementById('editEmail').value = emp.email;
    document.getElementById('editPosition').value = emp.position;

    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'flex';
  },

  closeEditModal: function () {
    const modal = document.getElementById('editModal');
    if (modal) modal.style.display = 'none';
  },

  submitEmployeeUpdate: async function (event) {
    if (event) event.preventDefault();

    const id = document.getElementById('editEmployeeId').value;
    const newName = document.getElementById('editName').value.trim();
    const newEmail = document.getElementById('editEmail').value.trim();
    const newPosition = document.getElementById('editPosition').value.trim();

    if (!id || !newName || !newEmail || !newPosition) {
      alert('Please fill out all fields.');
      return;
    }

    const submitBtn = document.getElementById('editSubmitBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Confirm in MetaMask...';
    }

    try {
      const instance = App.contracts.EmployeeRegistration;
      instance.methods
        .updateEmployee(id, newName, newEmail, newPosition)
        .send({ from: App.account, gas: 300000 })
        .on('transactionHash', function (hash) {
          console.log('Update tx sent:', hash);
          if (submitBtn) submitBtn.textContent = 'Mining update...';
        })
        .on('receipt', async function (receipt) {
          console.log('Update confirmed:', receipt);
          alert('Employee #' + id + ' successfully updated on the blockchain!');
          App.closeEditModal();
          await App.updateBalance();
          await App.loadEmployees();
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save to Blockchain';
          }
        })
        .on('error', function (err) {
          console.error('Update error:', err);
          const msg = err.message || JSON.stringify(err);
          if (msg.includes('User denied') || msg.includes('user rejected')) {
            alert('Update was rejected in MetaMask.');
          } else {
            alert('Failed to update employee: ' + msg);
          }
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save to Blockchain';
          }
        });
    } catch (err) {
      console.error('submitEmployeeUpdate error:', err);
      alert('Error updating: ' + (err.message || err));
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save to Blockchain';
      }
    }
  },

  deleteEmployee: async function (id) {
    const emp = App.employeesData[id];
    const empName = emp ? emp.name : '#' + id;

    const confirmed = confirm(
      `Are you sure you want to remove ${empName} (#${id}) from the blockchain?\n\n` +
      `MetaMask will ask you to confirm this transaction.`
    );
    if (!confirmed) return;

    try {
      const instance = App.contracts.EmployeeRegistration;
      instance.methods
        .deleteEmployee(id)
        .send({ from: App.account, gas: 300000 })
        .on('transactionHash', function (hash) {
          console.log('Delete tx sent:', hash);
        })
        .on('receipt', async function (receipt) {
          console.log('Delete confirmed:', receipt);
          alert(`Employee #${id} has been removed from the blockchain.`);
          await App.updateBalance();
          await App.loadEmployees();
        })
        .on('error', function (err) {
          console.error('Delete error:', err);
          const msg = err.message || JSON.stringify(err);
          if (msg.includes('User denied') || msg.includes('user rejected')) {
            alert('Deletion was rejected in MetaMask.');
          } else {
            alert('Failed to delete employee: ' + msg);
          }
        });
    } catch (err) {
      console.error('deleteEmployee error:', err);
      alert('Error deleting: ' + (err.message || err));
    }
  },

  viewTransactionDetails: function (txHash) {
    alert('Transaction Hash Details:\n\n' + txHash + '\n\nThis transaction was mined on your local Ganache blockchain.');
  },

  disconnectWallet: function () {
    App.account = null;
    App.web3Provider = null;
    App.contracts = {};

    const accEl = document.getElementById('account');
    if (accEl) accEl.innerText = '';

    const tableBody = document.getElementById('employeesTableBody');
    if (tableBody) tableBody.innerHTML = '';

    window.location.href = 'index.html';
  },

  setupListeners: function () {
    if (App._listenersAttached || !window.ethereum) return;
    App._listenersAttached = true;

    window.ethereum.on('accountsChanged', function (accounts) {
      console.log('MetaMask account changed:', accounts);
      if (!accounts || accounts.length === 0) {
        App.disconnectWallet();
      } else {
        window.location.reload();
      }
    });

    window.ethereum.on('chainChanged', function (chainId) {
      console.log('MetaMask chain changed:', chainId);
      window.location.reload();
    });
  },
};

window.addEventListener('load', function () {
  App.init();
});