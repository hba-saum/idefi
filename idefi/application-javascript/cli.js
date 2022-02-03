'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('../../test-application/javascript/AppUtil.js');

const channelName = 'mychannel';
const chaincodeName = 'idefi28';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'app_User';

function prettyJSONString(inputString) {
	return JSON.stringify(JSON.parse(inputString), null, 2);
}


async function main() {
	try {
		const ccp = buildCCPOrg1();
		const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

		const wallet = await buildWallet(Wallets, walletPath);


		await enrollAdmin(caClient, wallet, mspOrg1);

		await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, 'org1.department1');

		// Create a new gateway instance for interacting with the fabric network.
		// In a real application this would be done as the backend server session is setup for
		// a user that has been verified.
		const gateway = new Gateway();

		try {
			await gateway.connect(ccp, {
				wallet,
				identity: org1UserId,
				discovery: { enabled: true, asLocalhost: true } 
			});

			const network = await gateway.getNetwork(channelName);
			const contract = network.getContract(chaincodeName);
			
			let totalDeposited = 0;
			let deposits;
			//create deposit 01
			try {
				let result = await contract.evaluateTransaction('UserDeposit', 'dep_012345_1', '012345', '1', '50000', '75');
	
				await contract.submitTransaction('UserDeposit', 'dep_012345_1', '012345', '1', '50000', '75');
				console.log(`Deposit successful! \n ${result}\n`);
			} catch (error) {
				console.log(`*** Successfully caught the error: \n    ${error}`);
			}


			//create deposit 02
			try {												
				let result = await contract.evaluateTransaction('UserDeposit', 'dep_123456_1', '123456', '1', '60000', '80');
	
				await contract.submitTransaction('UserDeposit', 'dep_123456_1', '123456', '1', '60000', '80');
				console.log(`Deposit successful! \n ${result}\n`);
			} catch (error) {
				console.log(`*** Successfully caught the error: \n    ${error}`);
			}

			
			
			//total deposited money
			try {
				let result = await contract.evaluateTransaction('returnAllDeposit', '1');
	
				//console.log(`Total Deposited Money: ${result} \n`);

				deposits = JSON.parse(result);
				
				for(let deposit of deposits){
					totalDeposited += parseInt(deposit.Record.Amount);
				}
				
				console.log(`Total deposited money: ${totalDeposited}`);
								

			} catch (error) {
				console.log(`*** Deposited money error: \n    ${error}`);
			}
			



			//invest in the business
			try {
				let result = await contract.evaluateTransaction('InvestToBusiness', 'inv_1', '1', totalDeposited);
	
				await contract.submitTransaction('InvestToBusiness', 'inv_1', '1', totalDeposited);
				console.log(`Investment successful! \n ${result}\n`);
			} catch (error) {
				console.log(`*** Investment error: \n    ${error}`);
			}



			// make all depositors Invested: 'yes'
			try {
				console.log("make all depositors Invested: 'yes'");
				console.log(deposits);
				for(let deposit of deposits){
					 //(ctx, id, accNo, businessId, amount, share)
					let result = await contract.evaluateTransaction('DepositorInvestedTrue', deposit.Record.ID);
					await contract.submitTransaction('DepositorInvestedTrue', deposit.Record.ID);
					console.log(`Depositor Investment:yes successful! \n ${result}\n`);
				}

			} catch (error) {
				console.log(`*** Successfully caught the error: \n    ${error}`);
			}



			// business returns the profit to the bank
			try {
				let result = await contract.evaluateTransaction('BusinessProfitReturns', 'bus_1', '1', '200000');
	
				await contract.submitTransaction('BusinessProfitReturns', 'bus_1', '1', '200000');
				console.log(`business profit return successful! \n ${result}\n`);
			} catch (error) {
				console.log(`*** business profit return error: \n    ${error}`);
			}




			//BusinessProfitReturnedTrue
			try {
				let result = await contract.evaluateTransaction('BusinessProfitReturnedTrue', 'bus_1');
	
				await contract.submitTransaction('BusinessProfitReturnedTrue', 'bus_1');
				console.log(`BusinessProfitReturnedTrue successful! \n ${result}\n`);
			} catch (error) {
				console.log(`*** BusinessProfitReturnedTrue error: \n    ${error}`);
			}
			

			// the amount that business returned
			let businessReturned = 0.0;
			try {
				let result = await contract.evaluateTransaction('BusinessProfitAmount', '1');
	
				console.log(`Total prift Money: ${result} \n`);

				let profit = JSON.parse(result);
								
				console.log(`Total deposited money: ${profit.Amount}`);
				businessReturned = parseFloat(profit.Amount);

			} catch (error) {
				console.log(`*** Deposited money error: \n    ${error}`);
			}


			// return deposits to ProfitReturned: 'no'
			try {
				let result = await contract.evaluateTransaction('returnDeposits', '1');
	
				console.log(`Total Deposited Money: ${result} \n`);

				let deps = JSON.parse(result);
				let a = 0;
				for(let deposit of deps){
					
					try {
																//ctx, id, accNo, share, deposited, businessId, investment, returned
						let result = await contract.evaluateTransaction('BankReturnsProfit', `prof_${a}`, deposit.Record.AccNo, 
																		deposit.Record.Share, 
																		deposit.Record.Amount, 
																		deposit.Record.BusinessId, 
																		totalDeposited, 
																		businessReturned);
		
						await contract.submitTransaction('BankReturnsProfit', `prof_${a}`, deposit.Record.AccNo, 
																		deposit.Record.Share, 
																		deposit.Record.Amount, 
																		deposit.Record.BusinessId, 
																		totalDeposited, 
																		businessReturned);
						console.log(`Deposit profit return successful! \n ${result}\n`);
						 a++;
					} catch (error) {
						console.log(`*** Successfully caught the error: \n    ${error}`);
					}
				}
			} catch (error) {
				console.log(`*** Deposited money error: \n    ${error}`);
			}
			



			// //find the deposit
			// try {
			// 	let result = await contract.evaluateTransaction('ReturnDepositAmount','123456', '1');
			// 	console.log(`Deposit found: ${result}`);
				
			// } catch (error) {
			// 	console.log(`***error: \n    ${error}`);
			// }

		} finally {
			gateway.disconnect();
		}
	} catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
	}
}

main();