# Ethereum Uniswap Tokens Swap

Ethereum Uniswap Tokens Swap is a Node.js script that demonstrates how to swap ERC20 tokens on the Ethereum network using Uniswap V2. It leverages [ethers.js](https://docs.ethers.org/) to interact with the blockchain and the Uniswap Router contract for executing token swaps. The script automatically handles gas estimation, token approval, and transaction execution, making it a useful starting point for developers looking to integrate Uniswap swaps into their projects.

---

## Features

- **Ethereum Connection:** Connects to an Ethereum node using a configurable RPC URL.
- **Wallet Integration:** Loads a wallet from a mnemonic phrase to sign transactions.
- **Token Management:** Retrieves token balances, decimals, and names.
- **Dynamic Swap Amount:** Allows specifying swap amounts as a percentage of the token balance (e.g., `100%`).
- **Uniswap Routing:** Builds the optimal swap path—direct swap or through WETH.
- **Gas Estimation:** Estimates gas fees for both approval and swap transactions.
- **Allowance Handling:** Resets token allowance before approving the Uniswap Router if needed.
- **Transaction Tracking:** Outputs an Etherscan transaction link after a successful swap.

---

## Prerequisites

- **Node.js:** Version 12 or later is required.
- **Mnemonic Phrase:** A valid mnemonic with sufficient funds (ETH for gas fees and tokens for swapping).
- **Ethereum RPC Provider:** An RPC endpoint (e.g., [Ankr](https://www.ankr.com/), [Infura](https://infura.io/)).

---

## Installation

1. **Clone the Repository:**

    ```bash
    git clone https://github.com/vkidik/eth-uniswap-swap.git
    cd eth-uniswap-swap
    ```

2. **Install Dependencies:**

    ```bash
    npm install
    ```

---

## Configuration

Create a `.env` file in the root directory of the project with the following content:

```env
MNEMONIC="your mnemonic phrase here"
```

Other configuration parameters are defined in `index.js`:

- **AMOUNT:** The amount of the input token to swap (supports percentage format, e.g., `100%`).
- **INPUT_MINT:** Contract address of the input ERC20 token.
- **OUTPUT_MINT:** Contract address of the output ERC20 token.
- **RPC_URL:** Ethereum RPC endpoint (e.g., `https://rpc.ankr.com/eth`).
- **UNISWAP_ROUTER_ADDRESS:** Address of the Uniswap V2 Router (`0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D` by default).
- **WETH_ADDRESS:** Address of the Wrapped Ether (WETH) token.

---

## How It Works

1. **Initialization:**  
   The script loads environment variables using `dotenv` and sets up the configuration parameters.

2. **Ethereum Connection:**  
   It connects to the Ethereum network using a JSON RPC provider and creates a wallet from the provided mnemonic.

3. **Token Data Retrieval:**  
   The script fetches the ETH balance (for gas fees) and the balance of the specified input token. It also retrieves token details such as decimals and name.

4. **Amount Calculation:**  
   If the swap amount is given as a percentage, the script calculates the corresponding amount based on the token balance.

5. **Uniswap Router Setup:**  
   The script configures the Uniswap Router contract and determines the swap route. If the output token is WETH, it uses a direct route; otherwise, it routes through WETH.

6. **Gas Estimation:**  
   It estimates the gas required for token approval and the swap operation, ensuring the wallet has enough ETH to cover the transaction fees.

7. **Token Approval:**  
   If the current allowance for the Uniswap Router is not zero, it resets it to zero before approving the new swap amount.

8. **Executing the Swap:**  
   The script calls `swapExactTokensForTokens` on the Uniswap Router to perform the token swap and waits for transaction confirmation.

9. **Transaction Output:**  
   Upon success, it prints a link to view the transaction on [Etherscan](https://etherscan.io/).

---

## Running the Script

Execute the script using Node.js:

```bash
node index.js
```

Monitor the console output for balance information, gas estimates, and the final transaction link.

---

## Error Handling

The script includes error handling for:
- Insufficient ETH balance for covering gas fees.
- Failures in token approval or swap execution.
- Issues in fetching token data or gas estimates.

Descriptive error messages will be logged to the console if any step fails.

---

## Disclaimer

- **Educational Purposes:** This script is provided as an example for educational and development purposes.
- **Risk Notice:** Use at your own risk. Ensure you test thoroughly on a testnet before using this script on the Ethereum mainnet.
- **No Liability:** The authors are not liable for any financial losses incurred using this code.

---

## Contributing

Contributions, issues, and feature requests are welcome! Please open an issue or submit a pull request on the [GitHub repository](https://github.com/vkidik/eth-uniswap-swap).

