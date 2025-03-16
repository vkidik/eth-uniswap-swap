// index.js

require('dotenv').config();
const { ethers } = require('ethers');

// Configuration
const CONFIG = {
  MNEMONIC: process.env.MNEMONIC || 'm',
  AMOUNT: '50%',
  INPUT_MINT: '0xInput_mint_token', 
  OUTPUT_MINT: '0xoutput_mint_token', 
  RPC_URL: 'https://rpc.ankr.com/eth',
  UNISWAP_ROUTER_ADDRESS: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  WETH_ADDRESS: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
};

// Function to swap tokens with enhanced error handling
async function swapTokens(mnemonic, amount, inputMint, outputMint) {
  try {
    // Connect to the RPC provider
    const provider = new ethers.providers.JsonRpcProvider(CONFIG.RPC_URL);
    const wallet = ethers.Wallet.fromMnemonic(mnemonic).connect(provider);
    const address = wallet.address;

    // Get ETH balance for gas payment
    const ethBalance = await provider.getBalance(address);
    console.log(`ETH Balance: ${ethers.utils.formatEther(ethBalance)} ETH`);

    // Standard ERC20 ABI: balanceOf, allowance, approve, decimals, and name
    const erc20Abi = [
      'function balanceOf(address owner) view returns (uint256)',
      'function allowance(address owner, address spender) view returns (uint256)',
      'function approve(address spender, uint256 amount) public returns (bool)',
      'function decimals() view returns (uint8)',
      'function name() view returns (string)'
    ];

    // Create contract for inputMint and try to get its name
    const inputTokenContract = new ethers.Contract(inputMint, erc20Abi, provider);
    let inputTokenName;
    try {
      inputTokenName = await inputTokenContract.name();
    } catch (err) {
      inputTokenName = inputMint;
    }

    // Get decimals and token balance
    const decimals = await inputTokenContract.decimals();
    const balance = await inputTokenContract.balanceOf(address);
    console.log(`Token Balance for ${inputTokenName}: ${ethers.utils.formatUnits(balance, decimals)}`);

    // Determine the amount for the swap
    let amountIn;
    if (typeof amount === 'string' && amount.endsWith('%')) {
      const percent = parseFloat(amount.slice(0, -1));
      amountIn = balance.mul(ethers.BigNumber.from(percent)).div(100);
    } else {
      amountIn = ethers.utils.parseUnits(amount.toString(), decimals);
    }
    console.log(`Amount to swap: ${ethers.utils.formatUnits(amountIn, decimals)} ${inputTokenName}`);

    if (amountIn.isZero()) {
      throw new Error(`No balance for token ${inputTokenName}`);
    }

    // Get the name for outputMint token
    let outputTokenName;
    let outputTokenContract;
    try {
      outputTokenContract = new ethers.Contract(outputMint, erc20Abi, provider);
      outputTokenName = await outputTokenContract.name();
    } catch (err) {
      outputTokenName = outputMint;
    }

    // Set up the Uniswap V2 Router
    const uniswapRouterAddress = CONFIG.UNISWAP_ROUTER_ADDRESS;
    const uniswapRouterAbi = [
      'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
      'function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)'
    ];
    const uniswapRouter = new ethers.Contract(uniswapRouterAddress, uniswapRouterAbi, wallet);

    // Build the swap route.
    // If outputMint equals WETH, use a two-token route; otherwise, route through WETH.
    const wethAddress = CONFIG.WETH_ADDRESS;
    const path = outputMint.toLowerCase() === wethAddress.toLowerCase() ?
      [inputMint, outputMint] : [inputMint, wethAddress, outputMint];
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    // Estimate gas for the approve operation
    const approvalGasLimit = ethers.BigNumber.from("100000");
    const feeData = await provider.getFeeData();
    const currentGasPrice = feeData.gasPrice;
    const approvalGasCost = approvalGasLimit.mul(currentGasPrice);
    console.log(`Gas estimate for approve: ${ethers.utils.formatEther(approvalGasCost)} ETH`);

    // Get expected swap outcome using getAmountsOut
    let amountOutMin;
    try {
      const amounts = await uniswapRouter.getAmountsOut(amountIn, path);
      // Check that the output amount is non-zero
      if (amounts[amounts.length - 1].isZero()) {
        throw new Error("Liquidity error: output amount is zero");
      }
      // Set minimum value to 95% of the calculated amount
      amountOutMin = amounts[amounts.length - 1].mul(95).div(100);
      console.log(`Expected swap output: ${amounts[amounts.length - 1].toString()} ${outputTokenName}`);
      console.log(`Minimum ${outputTokenName} (95%): ${amountOutMin.toString()}`);
    } catch (err) {
      throw new Error("Failed to fetch getAmountsOut data: " + err.message);
    }

    // Estimate gas for the swap.
    // If the estimation fails, set a fallback value (e.g., 300000)
    let estimatedSwapGas;
    try {
      estimatedSwapGas = await uniswapRouter.estimateGas.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        address,
        deadline
      );
      console.log(`Gas estimate for swap: ${ethers.utils.formatEther(estimatedSwapGas.mul(currentGasPrice))} ETH`);
    } catch (err) {
      console.warn("Gas estimation for swap failed, setting fallback gasLimit = 300000");
      estimatedSwapGas = ethers.BigNumber.from("300000");
    }

    const swapGasCost = estimatedSwapGas.mul(currentGasPrice);
    const totalEstimatedGasCost = approvalGasCost.add(swapGasCost);
    console.log(`Total estimated gas cost: ${ethers.utils.formatEther(totalEstimatedGasCost)} ETH`);

    if (ethBalance.lt(totalEstimatedGasCost)) {
      const shortage = totalEstimatedGasCost.sub(ethBalance);
      throw new Error(`Insufficient ETH for gas payment. Shortfall: ${ethers.utils.formatEther(shortage)} ETH`);
    }

    // Prepare contract for writing with inputMint
    const inputTokenContractWithWallet = new ethers.Contract(inputMint, erc20Abi, wallet);

    // Reset the current allowance if it is not zero (important for USDT)
    const currentAllowance = await inputTokenContract.allowance(address, uniswapRouterAddress);
    if (!currentAllowance.isZero()) {
      console.log('Resetting current allowance to 0...');
      const resetTx = await inputTokenContractWithWallet.approve(uniswapRouterAddress, 0, { gasLimit: approvalGasLimit });
      await resetTx.wait();
      console.log('Allowance has been reset to 0');
    }

    // Approve tokens for the Uniswap Router
    console.log('Approving tokens for the Uniswap Router...');
    const approveTx = await inputTokenContractWithWallet.approve(uniswapRouterAddress, amountIn, { gasLimit: approvalGasLimit });
    await approveTx.wait();
    console.log('Tokens approved');

    // Verify that the allowance has been set correctly
    const newAllowance = await inputTokenContract.allowance(address, uniswapRouterAddress);
    if (newAllowance.lt(amountIn)) {
      throw new Error("Approval failed: Allowance is less than the amount to swap.");
    }

    // Execute the swap with the fallback gas limit if necessary
    console.log('Executing swap...');
    const swapTx = await uniswapRouter.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      path,
      address,
      deadline,
      { gasLimit: estimatedSwapGas } // You can add a buffer, e.g., estimatedSwapGas.mul(2)
    );
    await swapTx.wait();
    console.log('Swap executed successfully!');

    // Generate a transaction link (mainnet)
    const txLink = `https://etherscan.io/tx/${swapTx.hash}`;
    return { success: true, txLink };

  } catch (error) {
    throw new Error('Error executing swap: ' + error.message);
  }
}

// Immediately Invoked Function Expression (IIFE)
(async () => {
  try {
    const result = await swapTokens(CONFIG.MNEMONIC, CONFIG.AMOUNT, CONFIG.INPUT_MINT, CONFIG.OUTPUT_MINT);
    console.log('Swap result:', result);
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
