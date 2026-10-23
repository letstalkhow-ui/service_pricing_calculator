/* Versioned planning scenarios; no market or overall viability claims. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./viability-engine'));
  else root.BusinessBoostsCash=factory(root.BusinessBoostsFinancial);
})(typeof globalThis!=='undefined'?globalThis:this,function(financial){
'use strict';
const VERSION='cash-scenarios-v1.0.0';
const SCENARIOS=Object.freeze({
  conservative:Object.freeze({label:'Conservative',demand:0.8,price:0.97,directCost:1.05,fixedCost:1.03,additionalRevenue:0.8,rampExtra:3,delayExtra:0.25}),
  expected:Object.freeze({label:'Expected',demand:1,price:1,directCost:1,fixedCost:1,additionalRevenue:1,rampExtra:0,delayExtra:0}),
  strong:Object.freeze({label:'Strong Execution',demand:1.2,price:1,directCost:1,fixedCost:1,additionalRevenue:1.1,rampExtra:0,delayExtra:-0.25}),
  stress:Object.freeze({label:'Stress Test',demand:0.6,price:0.95,directCost:1.1,fixedCost:1.05,additionalRevenue:0.6,rampExtra:6,delayExtra:1})
});
function nonnegative(v,name,fallback=0){if(v===undefined||v===null||v==='')return fallback;const n=Number(v);if(!Number.isFinite(n)||n<0)throw new Error(name+' must be a finite, non-negative number.');return n;}
function integer(v,name,min,max,fallback){const n=nonnegative(v,name,fallback);if(!Number.isInteger(n)||n<min||n>max)throw new Error(name+' is outside the supported range.');return n;}
function schedule(value,name){if(value===undefined)return null;if(!Array.isArray(value)||value.length!==12)throw new Error(name+' must contain 12 monthly amounts.');return value.map(v=>nonnegative(v,name));}
function run(input,scenarioKey='expected'){
  const config=SCENARIOS[scenarioKey];if(!config)throw new Error('Unknown scenario.');
  const base=financial.normalize(input);
  const cash=input.cash||{};
  const openingCash=nonnegative(cash.openingCash,'Opening cash');
  const investment=nonnegative(cash.investment,'Investment');
  const setup=nonnegative(cash.setupCosts,'Setup costs');
  const spendMonths=integer(cash.spendMonths,'Spending months',1,12,1);
  const ramp=integer(cash.rampMonths,'Ramp months',0,12,0);
  const rampMonths=ramp===0?0:Math.min(12,ramp+config.rampExtra);
  const startVolume=financial.normalize({...input,expectedVolume:nonnegative(cash.startingVolume,'Starting volume')}).expectedVolume;
  const targetVolume=Math.min(base.maxCapacity,base.expectedVolume*config.demand);
  if(startVolume>base.maxCapacity)throw new Error('Starting sales exceed capacity.');
  const startingVolume=startVolume;
  const delay=nonnegative(cash.collectionDelayMonths,'Payment delay');if(delay>12)throw new Error('Payment delay must be at most 12 months.');
  const collectionDelay=Math.max(0,Math.min(12,delay+config.delayExtra));
  const uncollected=nonnegative(cash.uncollectedPct,'Uncollected percentage');if(uncollected>100)throw new Error('Uncollected percentage cannot exceed 100.');
  const lateShare=nonnegative(cash.latePaymentPct,'Late payment percentage');if(lateShare>100)throw new Error('Late payment percentage cannot exceed 100.');
  const ownerDrawings=nonnegative(cash.ownerDrawings,'Owner drawings');
  const bufferMonths=nonnegative(cash.bufferMonths,'Safety buffer',1);if(bufferMonths>12)throw new Error('Safety buffer must be at most 12 months.');
  const loanMonths=integer(cash.loanMonths,'Loan repayment months',0,1200,12);
  const receivables=schedule(cash.openingReceivablesCollections,'Opening receivables')||Array(12).fill(0);
  const seasonality=schedule(cash.seasonality,'Seasonality')||Array(12).fill(1);
  const streams=base.additionalStreams.map(s=>({...s,revenueSchedule:schedule(s.revenueSchedule,'Extra revenue schedule'),costSchedule:schedule(s.costSchedule,'Extra cost schedule'),receiptMonth:integer(s.receiptMonth,'Receipt month',1,12,1)}));
  for(const s of streams)if(Boolean(s.revenueSchedule)!==Boolean(s.costSchedule))throw new Error('Provide both revenue and cost schedules.');
  const assumptions=[
    'Opening cash is the total available before the spending entered here. Owner and external contributions are not added again.',
    'Direct costs, overheads and owner drawings are paid in the month incurred; taxes, inventory timing and supplier credit are not modelled.',
    'Payments before delivery are conservatively treated as collected in the sale month; no advance subscription schedule is assumed.',
    'Monthly sales and capacity are already normal-month values. Operating weeks are not applied again.',
    'This projection uses month-end balances; a cash shortfall within a month may be larger.',
    'No cash from sales before Month 1 is assumed unless an opening receivables collection schedule is supplied.'
  ];
  if(streams.some(s=>s.kind==='seasonal'&&!s.revenueSchedule))assumptions.push('Seasonal extra income is spread evenly because monthly dates were not supplied. Test the actual timing before committing funds.');
  if(streams.some(s=>s.kind==='one-off'&&!s.revenueSchedule))assumptions.push('One-off extra income and its direct cost occur once, in the selected receipt month.');
  if(lateShare>0)assumptions.push(lateShare+'% of collectable sales are paid one month later than the normal payment terms.');
  if(cash.investmentAlreadyPaid)assumptions.push('Setup and equipment spending has already been paid before Month 1; it is not deducted again.');
  if(rampMonths)assumptions.push('Sales move in equal monthly steps from starting sales, reaching the target in Month '+rampMonths+'.');
  const collectionQueue=Array(26).fill(0);
  const rows=[];let balance=openingCash,lowest=openingCash,lowMonth=0,firstShortfall=null,cumulativeRecovery=0,recoveryMonth=null;
  let receivableBalance=0;
  const adjusted={...input,volumePeriod:'month',expectedVolume:targetVolume,maxCapacity:base.maxCapacity,
    sellingPrice:base.sellingPrice*config.price,realisedPrice:base.realisedPrice===null?null:base.realisedPrice*config.price,
    directCost:base.directCost*config.directCost,staffCost:base.staffCost*config.directCost,ownerLabour:base.ownerLabour*config.directCost,
    fixedCosts:base.fixedCosts*config.fixedCost,growthCosts:base.growthCosts*config.fixedCost,
    capacitySteps:base.capacitySteps.map(s=>({...s,monthlyCost:s.monthlyCost*config.fixedCost})),
    additionalStreams:[]};
  const steady=financial.calculate({...adjusted,additionalStreams:streams.map(s=>({...s,amount:s.monthlyRevenue*config.additionalRevenue,directCost:(s.monthlyRevenue-s.monthlyContribution)*config.directCost,period:'month'}))});
  for(let i=0;i<12;i++){
    const rampFactor=rampMonths?Math.min(1,(i+1)/rampMonths):1;
    const volume=Math.min(base.maxCapacity,(startingVolume+(targetVolume-startingVolume)*rampFactor)*seasonality[i]);
    const operating=financial.calculate({...adjusted,expectedVolume:volume});
    const unit=operating.unit_economics;
    let extraRevenue=0,extraCost=0;
    for(const s of streams){
      const active=s.kind!=='one-off'||i===s.receiptMonth-1;
      extraRevenue+=(s.revenueSchedule?s.revenueSchedule[i]:(active?s.monthlyRevenue:0))*config.additionalRevenue;
      extraCost+=(s.costSchedule?s.costSchedule[i]:(active?s.monthlyRevenue-s.monthlyContribution:0))*config.directCost;
    }
    const revenue=volume*unit.effective_price+extraRevenue;
    const collectible=revenue*(1-uncollected/100);
    function enqueue(amount,lag){const whole=Math.floor(lag),fraction=lag-whole;collectionQueue[i+whole]+=amount*(1-fraction);collectionQueue[i+whole+1]+=amount*fraction;}
    enqueue(collectible*(1-lateShare/100),collectionDelay);
    enqueue(collectible*lateShare/100,Math.min(13,collectionDelay+1));
    const collected=collectionQueue[i]+receivables[i];
    receivableBalance+=collectible-collectionQueue[i];
    // Owner labour is an economic cost, not a cash payout. Actual withdrawals are separate.
    const directCash=volume*(unit.direct_cost-base.ownerLabour*config.directCost)+extraCost;
    const stepCost=operating.capacity_results.expected_step_cost;
    const fixed=base.fixedCosts*config.fixedCost,growth=base.growthCosts*config.fixedCost;
    const debt=i<loanMonths?base.loanRepayment:0;
    const spend=cash.investmentAlreadyPaid?0:(i<spendMonths?investment/spendMonths:0)+(i===0?setup:0);
    const profit=operating.financial_results.operating_profit+extraRevenue-extraCost;
    const operatingCash=collected-directCash-stepCost-fixed-growth;
    const netCash=operatingCash-debt-ownerDrawings-spend;
    const opening=balance;balance+=netCash;
    if(balance<lowest){lowest=balance;lowMonth=i+1;}
    if(balance<0&&firstShortfall===null)firstShortfall=i+1;
    const buffer=bufferMonths*(directCash+stepCost+fixed+growth+debt+ownerDrawings);
    // Recovery requires real cash after debt/drawings, measured against the full investment.
    cumulativeRecovery+=operatingCash-debt-ownerDrawings;
    if(investment+setup>0&&recoveryMonth===null&&cumulativeRecovery>=investment+setup)recoveryMonth=i+1;
    rows.push({month:i+1,volume,opening_cash:opening,revenue,cash_collected:collected,direct_cost_cash:directCash,capacity_step_cost:stepCost,fixed_cost:fixed,growth_cost:growth,core_operating_profit:profit+growth,operating_profit:profit,loan_repayment:debt,owner_drawings:ownerDrawings,investment_spending:spend,operating_cash:operatingCash,net_cash:netCash,closing_cash:balance,safety_buffer:buffer});
  }
  const fundingGap=Math.max(0,-lowest);
  const bufferGap=Math.max(0,...rows.map(r=>r.safety_buffer-r.closing_cash));
  const annualProfit=rows.reduce((a,r)=>a+r.operating_profit,0);
  const annualOperatingCash=rows.reduce((a,r)=>a+r.operating_cash,0);
  const flags=[...steady.hard_stop_flags];if(fundingGap>0)flags.push('CASH_FUNDING_GAP');
  const stableMonth=rows.findIndex((r,i)=>rows.slice(i).every(x=>x.operating_profit>=0));
  if(firstShortfall!==null&&(stableMonth<0||firstShortfall<=stableMonth+1))flags.push('CASH_EXHAUSTED_BEFORE_STABLE_BREAK_EVEN');
  const cashStatus=fundingGap>0?'Funding gap':bufferGap>0?'Tight':'Adequate';
  return {model_version:VERSION,scenario:scenarioKey,scenario_assumptions:config,assumptions,financial_results:steady,
    cash_results:{months:rows,opening_cash:openingCash,closing_cash:balance,lowest_cash:lowest,lowest_cash_month:lowMonth,funding_gap:fundingGap,buffer_funding_gap:bufferGap,first_shortfall_month:firstShortfall,cash_status:cashStatus,annual_operating_profit:annualProfit,annual_operating_cash:annualOperatingCash,uncollected_revenue:rows.reduce((a,r)=>a+r.revenue,0)*uncollected/100,receivables_after_month_12:receivableBalance,stable_operating_break_even_month:stableMonth<0?null:stableMonth+1},
    investment_results:{investment_and_setup:investment+setup,minimum_opening_cash:openingCash+fundingGap,simple_payback_months:steady.financial_results.operating_profit>0?(investment+setup)/steady.financial_results.operating_profit:null,cash_recovery_month:recoveryMonth,cash_recovered_in_year:Math.max(0,cumulativeRecovery),recovery_status:investment+setup===0?'No investment entered':recoveryMonth===null?'Not recovered within 12 months':'Recovered within 12 months'},
    hard_stop_flags:[...new Set(flags)]};
}
function simulate(input){
  const scenarios={};for(const key of Object.keys(SCENARIOS))scenarios[key]=run(input,key);
  function resilience(profitKey){const passes=Object.fromEntries(Object.entries(scenarios).map(([k,s])=>[k,profitKey(s)>=0]));return {passes,label:passes.stress&&passes.conservative&&passes.expected&&passes.strong?'Very strong':passes.conservative&&passes.expected&&passes.strong?'Strong':passes.expected&&passes.strong?'Moderate':passes.strong?'Very fragile':'Requires adjustment'};}
  return {model_version:VERSION,scenario_results:scenarios,core_resilience:resilience(s=>s.financial_results.financial_results.core_operating_profit),growth_resilience:resilience(s=>s.financial_results.financial_results.operating_profit),cash_resilience:{scenarios_without_funding_gap:Object.values(scenarios).filter(s=>s.cash_results.funding_gap===0).length,total_scenarios:4}};
}
return {VERSION,SCENARIOS,run,simulate};
});
