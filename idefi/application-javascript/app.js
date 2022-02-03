'use strict';

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('../../test-application/javascript/AppUtil.js');
const { parse } = require('path');

const channelName = 'mychannel';
const chaincodeName = 'idefiFinal';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'app_user';

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

		const gateway = new Gateway();

		try {
			await gateway.connect(ccp, {
				wallet,
				identity: org1UserId,
				discovery: { enabled: true, asLocalhost: true } 
			});

			const network = await gateway.getNetwork(channelName);
			const contract = network.getContract(chaincodeName);

			let totalDepositedMoney = 0;
			let businessReturned = 0;
			let deposits;
			
			////network/////////////////////////////////////////////

			let express = require('express');
			let app = express();
			const PORT = 3000; 

			app.use(express.urlencoded({extended: false}));
			app.use(express.json());

			app.get('/', async function(req,res){
				
				res.send('Hello World ideifi');
			});
			

			//create deposit
			app.post('/depositMoney', async function(req, res){
				const {accNo, businessId, amount, share} = req.body;
				let id = `dep_${accNo}_${businessId}`;

				//
				try {
					let result = await contract.evaluateTransaction('UserDeposit', 
																	id, 
																	accNo, 
																	businessId, 
																	amount, 
																	share);
		
					await contract.submitTransaction('UserDeposit', 
													id, 
													accNo, 
													businessId, 
													amount, 
													share);
					
					res.send(result.toString());
				} catch (error) {
					res.status(400).send(error.toString());
				}
	
			});


			//total deposited money
			app.get('/totalDeposit/:id', async function(req, res){
				
				let businessId = req.params.id;

				//
				try {
					let result = await contract.evaluateTransaction('returnAllDeposit', businessId);
		
					//console.log(`Total Deposited Money: ${result} \n`);
	
					let deposits = JSON.parse(result);

					let i = 0;
					let totalDeposited = 0;
					for(let deposit of deposits){
						totalDeposited += parseInt(deposit.Record.Amount);
					}
					
					//console.log(`Total deposited: ${totalDeposited}`);
					totalDepositedMoney = totalDeposited;
					res.json(totalDepositedMoney);
									
	
				} catch (error) {
					res.status(400).send(error.toString());
				}
				
	
			});			
			

			//invest in the business
			app.post('/investToBusiness', async function(req, res){
				const {businessId} = req.body;
				let id = `inv_${businessId}`;

				//
				try {
					let result = await contract.evaluateTransaction('InvestToBusiness', id, businessId, totalDepositedMoney);
		
					await contract.submitTransaction('InvestToBusiness', id, businessId, totalDepositedMoney);

					res.send(result.toString());
					
				} catch (error) {
					res.status(400).send(error.toString());
				}
	
			});


			// make all depositors Invested: 'yes' 
			app.post('/InvestedTrue', async function(req, res){
				const {businessId} = req.body;
				////geting all the deposits json
				let allDeposits;
				try {
					let result = await contract.evaluateTransaction('returnAllDeposit', businessId);
		
					//console.log(`Total Deposited Money: ${result} \n`);
	
					allDeposits = JSON.parse(result);			
	
				} catch (error) {
					res.status(400).send(error.toString());
				}
				

				//
				try {
					console.log("make all depositors Invested: 'yes'");
					console.log(deposits);
					for(let deposit of allDeposits){
						 //(ctx, id, accNo, businessId, amount, share)
						let result = await contract.evaluateTransaction('DepositorInvestedTrue', deposit.Record.ID);
						await contract.submitTransaction('DepositorInvestedTrue', deposit.Record.ID);
						res.send("confirmed");
					}
	
				} catch (error) {
					console.log(`*** Successfully caught the error: \n    ${error}`);
				}
	
			});

			
			// business returns the profit to the bank
			app.post('/BusinessReturnsProfit', async function(req, res){
				const {businessId, amount} = req.body;
				let id = `bus_${businessId}`;

				//
				try {
					let result = await contract.evaluateTransaction('BusinessProfitReturns', id, businessId, amount);
		
					await contract.submitTransaction('BusinessProfitReturns', id, businessId, amount);
					res.send(result.toString());
				} catch (error) {
					console.log(`*** business profit return error: \n    ${error}`);
				}				
			});



			// BusinessProfitReturnedTrue
			app.post('/BusinessReturnsProfitTrue', async function(req, res){
				const {businessId} = req.body;
				let id = `bus_${businessId}`;

				//
				try {
					let result = await contract.evaluateTransaction('BusinessProfitReturnedTrue', id);
		
					await contract.submitTransaction('BusinessProfitReturnedTrue', id);
					res.send(result.toString());
				} catch (error) {
					console.log(`*** BusinessProfitReturnedTrue error: \n    ${error}`);
				}					
			});


			// return deposits to ProfitReturned: 'no'
			//let a = 0;
			app.post('/returnDeposit', async function(req, res){
				const {businessId, invested, returned} = req.body;
				let id = `bus_${businessId}`;


				try {
					let result = await contract.evaluateTransaction('BusinessProfitAmount', businessId);
					let amount = JSON.parse(result);
					await contract.submitTransaction('BusinessProfitAmount', businessId);
					businessReturned = parseFloat(amount.Amount);
				} catch (error) {
					console.log(`*** BusinessProfitReturnedTrue error: \n    ${error}`);
				}	
				console.log(`*** BusinessProfitReturnedTrue: ${businessReturned}`);
				
				//
				try {
					let result = await contract.evaluateTransaction('returnDeposits', '1');
		
					console.log(`Total Deposited Money: ${result} \n`);
	
					let deps = JSON.parse(result);
					
					for(let deposit of deps){
						
						try {

																	//ctx, id, accNo, share, deposited, businessId, investment, returned
							let result = await contract.evaluateTransaction('BankReturnsProfit', `prof_${deposit.Record.AccNo}`, deposit.Record.AccNo, 
																			deposit.Record.Share, 
																			deposit.Record.Amount, 
																			deposit.Record.BusinessId, 
																			invested, 
																			returned);
			
							await contract.submitTransaction('BankReturnsProfit', `prof_${deposit.Record.AccNo}`, deposit.Record.AccNo, 
																			deposit.Record.Share, 
																			deposit.Record.Amount, 
																			deposit.Record.BusinessId, 
																			invested, 
																			returned);
							//res.send(result.toString());
							//a++;
						} catch (error) {
							console.log(`*** Successfully caught the error in sending money: \n    ${error}`);
						}
					}
				} catch (error) {
					console.log(`*** Deposited money error: \n    ${error}`);
				}
				
					
			});


			




			var server=app.listen(PORT,function() {
				console.log(`Server on port ${PORT}`);
			});

		} finally {
			//gateway.disconnect();
		}
	} catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
	}
}

main();