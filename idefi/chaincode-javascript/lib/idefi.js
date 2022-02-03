'use strict';

const { Contract } = require('fabric-contract-api');

class Idefi extends Contract {
    //user deposits money to bank
    async UserDeposit(ctx, id, accNo, businessId, amount, share) {
        const deposit = {
            ID: id,
            AccNo: accNo,
            BusinessId: businessId,
            Amount: amount,
            Share: share,
            Invested: 'no',
            ProfitReturned: 'no',
            DataType: 'deposit',

        };
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(deposit)));
        return JSON.stringify(deposit);
    }

    // return depositors invested amount
    async ReturnDepositAmount(ctx, accNo, businessId) {
        const id = `dep_${accNo}_${businessId}`;
        const assetJSON = await ctx.stub.getState(id); 
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    // Total deposited money JSON
    async returnAllDeposit(ctx, businessId){
		let queryString = {};
		queryString.selector = {};
		queryString.selector.DataType = 'deposit';
        queryString.selector.Invested = 'no';
		queryString.selector.BusinessId = businessId;

        return await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); 
    }

    //invest to business
    async InvestToBusiness(ctx, id, businessId, amount) {
        const invest = {
            ID: id,
            BusinessId: businessId,
            Amount: amount,
            ProfitReturned: 'no',
            DataType: 'invest',
        };


        await ctx.stub.putState(id, Buffer.from(JSON.stringify(invest)));
        return JSON.stringify(invest);
    }

    // depositor Invested: 'yes'
    async DepositorInvestedTrue(ctx, id){
        const assetJSON = await ctx.stub.getState(id); 
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The depositor does not exist`);
        }
        let deposit = JSON.parse(assetJSON.toString());
        deposit.Invested = 'yes';

        await ctx.stub.putState(id, Buffer.from(JSON.stringify(deposit)));
        return JSON.stringify(deposit);        
    }

    // business returns profit/loss
    async BusinessProfitReturns(ctx, id, businessId, amount) {
        const deposit = {
            ID: id,
            BusinessId: businessId,
            Amount: amount,
        };
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(deposit)));
        return JSON.stringify(deposit);
    }    

    // business ProfitReturned: 'yes'
    async BusinessProfitReturnedTrue(ctx, id){
        const assetJSON = await ctx.stub.getState(id); 
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The investment does not exist`);
        }
        let deposit = JSON.parse(assetJSON.toString());
        deposit.ProfitReturned = 'yes';

        await ctx.stub.putState(id, Buffer.from(JSON.stringify(deposit)));
        return JSON.stringify(deposit);        
    }    
    // return business profit amount
    async BusinessProfitAmount(ctx, businessId) {
        const id = `bus_${businessId}`;
        const assetJSON = await ctx.stub.getState(id); 
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The business ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    // return all deposit with ProfitReturned: 'no'
    async returnDeposits(ctx, businessId){
		let queryString = {};
		queryString.selector = {};
		queryString.selector.DataType = 'deposit';
        queryString.selector.ProfitReturned = 'no';
		queryString.selector.BusinessId = businessId;

        return await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString)); 
    }


    //bank returns profit
    async BankReturnsProfit(ctx, id, accNo, share, deposited, businessId, investment, returned) {
        let profit = parseFloat(returned) - parseFloat(investment);
        let profitRate;
        let totalProfit;
        let depProfit;
        let balaceReturn;
        if(profit>0){
            profitRate = (profit/parseFloat(investment))*100;
            totalProfit = (parseFloat(deposited)*profitRate)/100;
            depProfit = (totalProfit*parseFloat(share))/100;
            balaceReturn = parseFloat(deposited) + parseFloat(depProfit);    
        }
        else{
            profitRate = (profit/parseFloat(investment))*100;
            totalProfit = (parseFloat(deposited)*profitRate)/100;
            balaceReturn = parseFloat(deposited) + parseFloat(depProfit);  
        }


        const deposit = {
            ID: id,
            AccNo: accNo,
            BusinessId: businessId,
            BalaceReturn: balaceReturn,
            DataType: 'profitReturn',
        };
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(deposit)));
        return JSON.stringify(deposit);
    }        


    ////////------------------/////////////////////
	async GetQueryResultForQueryString(ctx, queryString) {

		let resultsIterator = await ctx.stub.getQueryResult(queryString);
		let results = await this._GetAllResults(resultsIterator, false);

		return JSON.stringify(results);
	}    


    async _GetAllResults(iterator, isHistory) {
		let allResults = [];
		let res = await iterator.next();
		while (!res.done) {
			if (res.value && res.value.value.toString()) {
				let jsonRes = {};
				console.log(res.value.value.toString('utf8'));
				if (isHistory && isHistory === true) {
					jsonRes.TxId = res.value.txId;
					jsonRes.Timestamp = res.value.timestamp;
					try {
						jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
					} catch (err) {
						console.log(err);
						jsonRes.Value = res.value.value.toString('utf8');
					}
				} else {
					jsonRes.Key = res.value.key;
					try {
						jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
					} catch (err) {
						console.log(err);
						jsonRes.Record = res.value.value.toString('utf8');
					}
				}
				allResults.push(jsonRes);
			}
			res = await iterator.next();
		}
		iterator.close();
		return allResults;
	}






    // // UpdateAsset updates an existing asset in the world state with provided parameters.
    // async UpdateAsset(ctx, id, color, size, owner, appraisedValue) {
    //     const exists = await this.AssetExists(ctx, id);
    //     if (!exists) {
    //         throw new Error(`The asset ${id} does not exist`);
    //     }

    //     // overwriting original asset with new asset
    //     const updatedAsset = {
    //         ID: id,
    //         Color: color,
    //         Size: size,
    //         Owner: owner,
    //         AppraisedValue: appraisedValue,
    //     };
    //     return ctx.stub.putState(id, Buffer.from(JSON.stringify(updatedAsset)));
    // }

    // // DeleteAsset deletes an given asset from the world state.
    // async DeleteAsset(ctx, id) {
    //     const exists = await this.AssetExists(ctx, id);
    //     if (!exists) {
    //         throw new Error(`The asset ${id} does not exist`);
    //     }
    //     return ctx.stub.deleteState(id);
    // }

    // // AssetExists returns true when asset with given ID exists in world state.
    // async AssetExists(ctx, id) {
    //     const assetJSON = await ctx.stub.getState(id);
    //     return assetJSON && assetJSON.length > 0;
    // }

    // TransferAsset updates the owner field of asset with given id in the world state.
    // async TransferAsset(ctx, id, newOwner) {
    //     const assetString = await this.ReadAsset(ctx, id);
    //     const asset = JSON.parse(assetString);
    //     asset.Owner = newOwner;
    //     return ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
    // }

    // GetAllAssets returns all assets found in the world state.
    // async GetAllAssets(ctx) {
    //     const allResults = [];
    //     // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
    //     const iterator = await ctx.stub.getStateByRange('', '');
    //     let result = await iterator.next();
    //     while (!result.done) {
    //         const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
    //         let record;
    //         try {
    //             record = JSON.parse(strValue);
    //         } catch (err) {
    //             console.log(err);
    //             record = strValue;
    //         }
    //         allResults.push({ Key: result.value.key, Record: record });
    //         result = await iterator.next();
    //     }
    //     return JSON.stringify(allResults);
    // }


}

module.exports = Idefi;
