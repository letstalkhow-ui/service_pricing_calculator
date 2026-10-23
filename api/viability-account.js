const {createService}=require('../lib/viability-accounts');
module.exports=async function handler(req,res){try{return res.status(200).json(await createService().handle(req,res));}catch(error){res.setHeader('Cache-Control','no-store');return res.status(error.status||500).json({error:error.status?error.message:'The account service is temporarily unavailable.'});}};
