/* Deterministic financial model. Shared by Node and the preview UI. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BusinessBoostsFinancial=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION='financial-v1.0.0';
function number(value,name, fallback=0){if(value===undefined||value===null||value==='')return fallback;const n=Number(value);if(!Number.isFinite(n)||n<0)throw new Error(name+' must be a finite, non-negative number.');return n;}
function normalize(input){
 const n={};for(const key of ['sellingPrice','directCost','staffCost','ownerLabour','fixedCosts','growthCosts','expectedVolume','maxCapacity','discountPct','feePct','loanRepayment'])n[key]=number(input[key],key);
 if(n.sellingPrice<=0||n.maxCapacity<=0)throw new Error('Price and capacity must be greater than zero.');
 if(n.discountPct>100||n.feePct>100)throw new Error('Percentages must be between 0 and 100.');
 const weeks=number(input.operatingWeeks,'operatingWeeks',52),days=number(input.operatingDays,'operatingDays',5);
 if(weeks<=0||weeks>52||days<=0||days>7)throw new Error('Check operating weeks and days.');
 // Monthly values already represent a normal month; do not apply operating weeks twice.
 const factors={day:days*weeks/12,week:weeks/12,month:1,year:1/12};
 const period=input.volumePeriod||'month';if(!(period in factors))throw new Error('Unknown sales period.');
 n.expectedVolume*=factors[period];n.maxCapacity*=factors[period];n.annualExpectedVolume=n.expectedVolume*12;
 n.realisedPrice=input.realisedPrice===undefined||input.realisedPrice===null||input.realisedPrice===''?null:number(input.realisedPrice,'realisedPrice');
 n.capacitySteps=(input.capacitySteps||[]).map(s=>({threshold:number(s.threshold,'step threshold')*factors[period],monthlyCost:number(s.monthlyCost,'step cost')})).sort((a,b)=>a.threshold-b.threshold);
 n.additionalStreams=(input.additionalStreams||[]).map(s=>{if(!['recurring','seasonal','one-off'].includes(s.kind))throw new Error('Unknown revenue type.');const amount=number(s.amount,'additional revenue'),cost=number(s.directCost,'additional direct cost');const divisor=s.period==='year'?12:s.period==='month'?1:null;if(divisor===null)throw new Error('Choose month or year for additional revenue.');return {...s,monthlyRevenue:amount/divisor,monthlyContribution:(amount-cost)/divisor};});
 return n;
}
function calculate(input){
 const n=normalize(input),effectivePrice=n.realisedPrice===null?n.sellingPrice*(1-n.discountPct/100):n.realisedPrice;
 // Realised price is sales revenue after discounts, before payment fees and collections.
 const directCost=n.directCost+n.staffCost+n.ownerLabour+effectivePrice*n.feePct/100,contribution=effectivePrice-directCost;
 const repeatable=n.additionalStreams.filter(s=>s.kind!=='one-off'),extraRevenue=repeatable.reduce((a,s)=>a+s.monthlyRevenue,0),extraContribution=repeatable.reduce((a,s)=>a+s.monthlyContribution,0);
 const stepCost=q=>n.capacitySteps.reduce((a,s)=>a+(q>s.threshold?s.monthlyCost:0),0);
 // Evaluate every cost interval: step costs can create a loss again after an earlier break-even.
 function solve(growth,extra){
  if(contribution<=0)return null;
  let lower=0;const thresholds=[...new Set(n.capacitySteps.map(s=>Math.floor(s.threshold)))];
  for(const upper of [...thresholds,Infinity]){
   const candidate=Math.max(lower,Math.ceil((n.fixedCosts+growth+stepCost(lower)-extra)/contribution),0);
   if(candidate<=upper)return candidate;
   lower=upper+1;
  }
  return null;
 }
 const coreProfit=n.expectedVolume*contribution-n.fixedCosts-stepCost(n.expectedVolume)+extraContribution;
 const coreBE=solve(0,extraContribution),growthBE=solve(n.growthCosts,extraContribution),standaloneBE=solve(0,0);
 const operatingProfit=coreProfit-n.growthCosts,revenue=n.expectedVolume*effectivePrice+extraRevenue;
 const flags=[];if(contribution<=0)flags.push('NON_POSITIVE_CONTRIBUTION');if(coreBE===null||coreBE>n.maxCapacity)flags.push('BREAK_EVEN_ABOVE_CAPACITY');if(n.expectedVolume>n.maxCapacity)flags.push('DEMAND_ABOVE_CAPACITY');if(coreProfit<0)flags.push('CORE_OPERATING_LOSS');if(operatingProfit<0)flags.push('GROWTH_OPERATING_LOSS');if(operatingProfit<n.loanRepayment)flags.push('DEBT_CASH_PRESSURE');
 return {model_version:VERSION,normalized_inputs:n,unit_economics:{effective_price:effectivePrice,direct_cost:directCost,contribution_per_sale:contribution,contribution_margin:effectivePrice>0?contribution/effectivePrice:null},break_even_results:{core_volume:coreBE,growth_volume:growthBE,standalone_core_volume:standaloneBE,core_revenue:coreBE===null?null:coreBE*effectivePrice},capacity_results:{expected_utilisation:n.expectedVolume/n.maxCapacity,core_break_even_utilisation:coreBE===null?null:coreBE/n.maxCapacity,expected_step_cost:stepCost(n.expectedVolume)},additional_revenue_results:{repeatable_revenue:extraRevenue,repeatable_contribution:extraContribution,revenue_dependency:revenue>0?extraRevenue/revenue:0,one_off_revenue:n.additionalStreams.filter(s=>s.kind==='one-off').reduce((a,s)=>a+s.monthlyRevenue,0)},financial_results:{revenue,core_operating_profit:coreProfit,operating_profit:operatingProfit,operating_margin:revenue>0?operatingProfit/revenue:null,cash_surplus_after_debt:operatingProfit-n.loanRepayment,gap_to_break_even:coreBE===null?null:Math.max(0,coreBE-n.expectedVolume)},hard_stop_flags:flags};
}
return {VERSION,normalize,calculate};
});
