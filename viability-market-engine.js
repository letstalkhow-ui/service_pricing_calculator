(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./viability-engine'),require('./viability-cash-engine'));else root.BusinessBoostsMarket=factory(root.BusinessBoostsFinancial,root.BusinessBoostsCash);})(typeof globalThis!=='undefined'?globalThis:this,function(financial,cashEngine){
'use strict';
const VERSION='market-scoring-v1.1.0';
// All numerical choices beyond the locked framework are disclosed, provisional planning rules.
const CONFIG=Object.freeze({weights:Object.freeze({market:25,unit:25,breakEven:20,capacity:15,resilience:15}),shareRange:Object.freeze({conservative:0.65,expected:1,strong:1.35,stress:0.4}),affordability:Object.freeze([[0.001,0.95],[0.005,0.85],[0.01,0.70],[0.025,0.50],[0.05,0.30],[null,0.15]].map(Object.freeze)),staleYears:3});
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
function number(v,name,fallback=null){if(v===undefined||v===null||v==='')return fallback;const n=Number(v);if(!Number.isFinite(n)||n<0)throw new Error(name+' must be a non-negative number.');return n;}
function percent(v,name,fallback=null){const n=number(v,name,fallback);if(n!==null&&n>100)throw new Error(name+' cannot exceed 100%.');return n===null?null:n/100;}
function bucket(value,bands,scores){for(let i=0;i<bands.length;i++)if(value<bands[i])return scores[i];return scores[scores.length-1];}
function label(score){return score>=80?'Strong financial and market potential':score>=65?'Potentially viable':score>=50?'Viability uncertain':score>=35?'Model requires significant adjustment':'High viability risk';}
function market(input){
  const m=input.market||{},n=financial.normalize(input),missing=[],assumptions=[],sources=[];
  const snapshot=m.snapshot&&(!m.country||m.snapshot.country===m.country)?m.snapshot:null;
  const unsupported=m.customerType&&m.customerType!=='b2c';
  if(unsupported)return {status:'unsupported',reason:'This V1 market model covers consumers. Business buyers and mixed audiences need separate market evidence.',missing:['B2C scope'],assumptions:[],sources:[]};
  const publicPopulation=m.populationScope==='country'?snapshot?.population:null;
  const population=number(m.population,'Population',publicPopulation?.value??null);
  const target=percent(m.targetPct,'Target customer share');
  const serviceable=percent(m.serviceablePct,'Reachable share',80);
  const frequency=number(m.purchasesPerYear,'Purchase frequency');
  if(!['active','sales'].includes(m.volumeBasis))missing.push('How sales are counted');
  // An active customer pays the entered monthly price. Sales/orders use annual purchases.
  const annualFrequency=m.volumeBasis==='active'?12:frequency;
  const unitsPerCustomer=m.volumeBasis==='active'?1:annualFrequency===null?null:annualFrequency/12;
  if(population===null||population<=0)missing.push('Population for the selected area');
  if(target===null)missing.push('Share matching the paying-customer profile');
  if(unitsPerCustomer===null||unitsPerCustomer<=0)missing.push('Annual purchases per customer');
  if(m.population!==undefined&&m.population!==null&&m.population!=='')sources.push({metric:'population',source:m.populationSource||'User estimate',value:population,year:m.populationYear||null,scope:m.populationScope||'local'});
  else if(publicPopulation)sources.push({...publicPopulation,metric:'population',scope:'country'});
  let affordability=percent(m.affordabilityPct,'Affordability'),burden=null;const affordabilityOverridden=affordability!==null;
  if(affordability!==null)assumptions.push('Affordability is an explicit user assumption; it is not verified household purchasing-power data.');
  else{
    const gni=snapshot?.gni_ppp,ppp=snapshot?.ppp_conversion;
    if(gni?.value>0&&ppp?.value>0&&gni.year===ppp.year&&snapshot.currency===m.currency&&annualFrequency>0){
      const annualSpendInternational=n.sellingPrice*annualFrequency/ppp.value;
      burden=annualSpendInternational/gni.value;
      affordability=CONFIG.affordability.find(([limit])=>limit===null||burden<=limit)[1];
      // Positioning and purchase importance are context, not a second hidden affordability penalty.
      sources.push({...gni,metric:'gni_ppp'},{...ppp,metric:'ppp_conversion'});
      assumptions.push('Annual customer spending is converted from local currency to international dollars using the same-year PPP factor, then compared with GNI per person. This national proxy does not prove household affordability.');
    }else missing.push('Comparable income and PPP conversion data, or an affordability estimate');
  }
  const competitors=number(m.competitors,'Competitor count');if(competitors===null)missing.push('Competitor estimate');
  const age=m.asOfYear||new Date().getUTCFullYear();
  if(m.populationYear&&(number(m.populationYear,'Population year')>age||Number(m.populationYear)<1900))throw new Error('Population reference year must be between 1900 and the current year.');
  const stale=sources.filter(s=>s.year&&age-s.year>CONFIG.staleYears).map(s=>s.metric);
  assumptions.push('The 80% reachable-share default, affordability bands, competition multipliers and score mappings are BusinessBoosts planning assumptions pending calibration.');
  assumptions.push('Population must describe the selected area. A national population is used only for a national market; local coverage is not reduced by geography again.');
  if(m.volumeBasis==='active')assumptions.push('Sales and capacity mean active monthly paying customers; the entered price is monthly and annual spending uses 12 payments.');
  else assumptions.push('Annual unique buyers are converted to monthly sales using purchases per year divided by 12. A purchase once means once in this 12-month planning period.');
  if(m.profile==='families'||m.profile==='parents')assumptions.push('Family/parent markets must use paying households or parents in the target-profile share, not automatically the number of children.');
  if(missing.length)return {status:'incomplete',missing,assumptions,sources,stale_sources:stale};
  const substitution={low:0.15,moderate:0.3,high:0.5,very_high:0.75}[m.substitution||'moderate'];
  if(substitution===undefined)throw new Error('Unknown substitution pressure.');
  const maturity={new:0.275,early:0.45,established:0.675,incumbent:1}[m.maturity||'new'];if(maturity===undefined)throw new Error('Unknown maturity.');
  const differentiation={similar:0.85,some:1,clear:1.15,unknown:0.9}[m.differentiation||'unknown'];
  const access={none:0.7,small:0.9,existing:1.05,strong:1.15}[m.access||'none'];
  const dominance={no:1,some:0.85,yes:0.65,unknown:0.8}[m.dominance||'unknown'];
  const priceFactor=m.pricePosition==='higher'&&m.differentiation!=='clear'?0.8:m.pricePosition==='lower'?1.05:1;
  if([differentiation,access,dominance].some(v=>v===undefined))throw new Error('Unknown competition answer.');
  const execution=clamp(differentiation*access*dominance*priceFactor,0.35,1.4);
  const effectiveCompetitors=competitors*(1+substitution),baseline=1/(effectiveCompetitors+1);
  const shareOverride=percent(m.sharePct,'Attainable market share');
  const expectedShare=shareOverride===null?clamp(baseline*maturity*execution,0,1):shareOverride;
  if(shareOverride!==null)assumptions.push('Attainable market share is a user override; the competitive baseline remains visible for comparison.');
  const eligible=population*target,tam=eligible*affordability,sam=tam*serviceable;
  const demand={};for(const [key,factor] of Object.entries(CONFIG.shareRange)){const share=clamp(expectedShare*factor,0,1),unique=sam*share,monthly=unique*unitsPerCustomer;demand[key]={share,unique_customers_before_capacity:unique,monthly_units:Math.min(monthly,n.maxCapacity),capacity_bounded_customers:Math.min(monthly,n.maxCapacity)/unitsPerCustomer};}
  return {status:'ready',missing:[],population,eligible_population:eligible,affordability_factor:affordability,affordability_burden:burden,tam_customers:tam,tam_annual_value:tam*annualFrequency*n.sellingPrice,sam_customers:sam,sam_annual_value:sam*annualFrequency*n.sellingPrice,annual_purchase_frequency:annualFrequency,monthly_units_per_customer:unitsPerCustomer,effective_competitors:effectiveCompetitors,baseline_share:baseline,maturity_factor:maturity,execution_factor:execution,expected_share:expectedShare,demand,assumptions,sources,stale_sources:stale,overrides:{affordability:affordabilityOverridden,share:shareOverride!==null},public_data_snapshot:snapshot,provisional:true};
}
function confidence(input,result){
  const reasons=[],m=input.market||{};let penalty=0;
  if(result.status!=='ready')return {level:'Low',reasons:result.missing||[result.reason],separate_from_viability:true};
  if(result.stale_sources.length){penalty+=3;reasons.push('Some public data is over '+CONFIG.staleYears+' years old.');}
  if(m.evidence!=='records'){penalty+=2;reasons.push('Business and market inputs are estimates rather than checked records.');}
  const unknown=Math.max(0,number(m.unknownCount,'Unknown answers',0));if(unknown){penalty+=Math.min(5,unknown);reasons.push(unknown+' answers are unknown or replaced by assumptions.');}
  if(result.overrides.affordability){penalty+=2;reasons.push('Affordability is assumed rather than calculated from comparable public data.');}
  if(result.overrides.share){penalty+=2;reasons.push('Market capture uses a manual override.');}
  if(!m.populationYear&&m.population){penalty++;reasons.push('The local population estimate has no reference year.');}
  if(input.additionalStreams?.some(s=>s.kind==='seasonal'&&!s.revenueSchedule)){penalty++;reasons.push('Seasonal revenue is averaged because monthly timing is unknown.');}
  return {level:penalty>=6?'Low':penalty>=2?'Moderate':'High',reasons:reasons.length?reasons:['Critical inputs are supported by checked records and comparable recent public data.'],separate_from_viability:true};
}
function scoreAssessment(input,result,simulation,kind,projection){
  const scenario=simulation.scenario_results.expected,fin=scenario.financial_results,core=kind==='core';
  const be=core?fin.break_even_results.core_volume:fin.break_even_results.growth_volume;
  const profit=core?fin.financial_results.core_operating_profit:fin.financial_results.operating_profit;
  const obtainable=result.demand.expected.monthly_units;
  const target=financial.normalize(input).expectedVolume;
  const marketCoverage=target>0?obtainable/target:null,coverage=be===null?null:be===0?null:obtainable/be;
  const requiredCustomers=be===null?null:be/result.monthly_units_per_customer;
  const requiredShare=requiredCustomers===null||result.sam_customers===0?null:requiredCustomers/result.sam_customers;
  const margin=fin.unit_economics.contribution_margin;
  const util=be===null?null:be/fin.normalized_inputs.maxCapacity;
  const resilience=(core?simulation.core_resilience:simulation.growth_resilience).label;
  const scores={market:marketCoverage===null?0:bucket(marketCoverage,[0.7,1,1.5,2.5],[20,40,60,80,95]),unit:margin===null||margin<=0?0:bucket(margin,[0.1,0.2,0.35,0.5],[25,45,65,80,95]),breakEven:be===null?0:be===0?100:bucket(coverage,[0.8,1,1.25,2],[15,30,50,75,95]),capacity:util===null||util>1?0:bucket(util,[0.4,0.6,0.75,0.9],[95,85,70,50,30]),resilience:{'Very strong':95,Strong:80,Moderate:60,'Very fragile':25,'Requires adjustment':0}[resilience]};
  const reasons={market:'Obtainable monthly demand compared with the sales target.',unit:'Contribution margin after direct delivery costs.',breakEven:'Obtainable monthly demand compared with break-even sales.',capacity:'Share of current capacity required at break-even.',resilience:'Target operating profit across the four scenarios, separately from cash risk.'};
  const dimensions=Object.entries(scores).map(([key,score])=>({key,score,weight:CONFIG.weights[key],classification:score>=80?'Strong':score>=65?'Healthy':score>=50?'Moderate':score>=35?'Weak':'High risk',reason:reasons[key],main_risk:score<65?reasons[key]:null}));
  const raw=dimensions.reduce((a,d)=>a+d.score*d.weight/100,0),flags=[];let cap=100;
  function limit(code,ceiling,reason){flags.push({code,ceiling,reason});cap=Math.min(cap,ceiling);}
  if(fin.unit_economics.contribution_per_sale<=0)limit('NON_POSITIVE_CONTRIBUTION',34,'Each sale fails to contribute towards normal operating costs.');
  if(be===null||be>fin.normalized_inputs.maxCapacity)limit('BREAK_EVEN_ABOVE_CAPACITY',34,'The current setup cannot deliver enough sales to cover costs.');
  if(be!==null&&obtainable<be)limit('MARKET_BELOW_BREAK_EVEN',49,'Estimated obtainable monthly demand is below the required sales level.');
  if(profit<0)limit('EXPECTED_OPERATING_LOSS',49,'Expected operating profit is negative after the modelled demand constraint.');
  if(scenario.cash_results.funding_gap>0)limit('CASH_FUNDING_GAP',79,'The 12-month plan needs more cash; a Strong classification is withheld.');
  if(scenario.hard_stop_flags.includes('CASH_EXHAUSTED_BEFORE_STABLE_BREAK_EVEN'))limit('CASH_BEFORE_BREAK_EVEN',79,'Cash falls below zero before stable operating break-even.');
  if(profit<fin.normalized_inputs.loanRepayment)limit('DEBT_CASH_PRESSURE',64,'Loan repayments exceed target-level operating profit.');
  if(projection?.scenario_results.expected.cash_results.funding_gap>0)limit('PROJECTED_CASH_FUNDING_GAP',79,'The 36-month continuation has a modelled funding gap.');
  if(!core&&projection){
    const recovery=Object.fromEntries(Object.entries(projection.scenario_results).map(([key,s])=>[key,s.investment_results.cash_recovery_month!==null&&s.investment_results.cash_recovery_retained_at_end]));
    const cost=projection.scenario_results.expected.investment_results.investment_and_setup;
    if(cost>0&&!recovery.expected)flags.push({code:'INVESTMENT_NOT_RECOVERED',ceiling:null,reason:'Setup and equipment spending is not recovered and retained from free cash within 36 months under Expected assumptions.'});
    if(cost>0&&recovery.strong&&!recovery.expected&&!recovery.conservative&&!recovery.stress)limit('STRONG_ONLY_RECOVERY',79,'Investment recovery depends entirely on Strong Execution.');
  }
  const final=Math.floor(Math.min(raw,cap)*10)/10;
  return {scope:kind,raw_score:Math.round(raw*10)/10,score:Math.round(final*10)/10,classification:label(final),dimensions,hard_stop_flags:flags,market_coverage:marketCoverage,break_even_coverage:coverage,required_market_share:requiredShare,break_even_customers:requiredCustomers,modelled_monthly_sales:fin.normalized_inputs.expectedVolume,expected_operating_profit:profit,provisional:true};
}
function obtainableText(value){return (Math.round(value*10)/10).toLocaleString('en-US');}
function assess(input){
  const result=market(input),modelConfidence=confidence(input,result);
  if(result.status!=='ready')return {model_version:VERSION,market_results:result,model_confidence:modelConfidence,overall_score:null,overall_classification:'Assessment incomplete',core_business_assessment:null,expansion_plan_assessment:null,scenario_results:null,recommended_actions:[{action:'Validate the missing market inputs',reason:result.reason||result.missing.join('; ')}]};
  const caps=Object.fromEntries(Object.entries(result.demand).map(([k,v])=>[k,v.monthly_units]));
  const constrained={...input,marketVolumeCaps:caps};
  const full=cashEngine.simulate(constrained);
  // Core comparison removes discretionary growth/setup spending, retaining current debt and drawings.
  const coreSimulation=cashEngine.simulate({...constrained,growthCosts:0,cash:{...input.cash,investment:0,setupCosts:0}});
  const projection=cashEngine.simulate(constrained,36);
  const coreProjection=cashEngine.simulate({...constrained,growthCosts:0,cash:{...input.cash,investment:0,setupCosts:0}},36);
  const core=scoreAssessment(input,result,coreSimulation,'core',coreProjection),expansion=scoreAssessment(input,result,full,'growth',projection);
  const actions=[];
  const flags=expansion.hard_stop_flags;
  const add=(action,reason)=>{if(!actions.some(a=>a.action===action))actions.push({action,reason});};
  if(flags.some(f=>f.code==='NON_POSITIVE_CONTRIBUTION'))add('Change the price or direct cost before pursuing more sales','More sales currently add no contribution towards overheads.');
  if(flags.some(f=>f.code==='BREAK_EVEN_ABOVE_CAPACITY'))add('Reduce the break-even requirement or redesign capacity','The current setup cannot deliver enough contribution at full capacity.');
  if(flags.some(f=>f.code==='MARKET_BELOW_BREAK_EVEN'))add('Validate demand before committing more capital','Modelled obtainable demand is below the number of monthly sales required.');
  const gap=full.scenario_results.expected.cash_results.funding_gap;
  if(gap>0)add('Fund or reduce the cash shortfall','At least '+Math.ceil(gap)+' '+(input.market?.currency||'currency units')+' is needed to avoid negative modelled month-end cash, before a safety reserve.');
  if(flags.some(f=>f.code==='STRONG_ONLY_RECOVERY'))add('Reduce the investment exposure or validate the upside case','The spending is only recovered and retained under Strong Execution within 36 months.');
  if(core.score>expansion.score&&input.growthCosts>0)add('Rephase the expansion plan','Core operations score better than the plan after growth costs.');
  if(flags.some(f=>f.code==='DEBT_CASH_PRESSURE'))add('Review the repayment structure','Debt repayments exceed target-level operating profit.');
  if(modelConfidence.level!=='High')add('Check the assumptions with records or a small sales test','Confidence in the evidence is '+modelConfidence.level.toLowerCase()+'. This does not change the viability score.');
  if(actions.length<3)add('Test weaker sales and payment timing','Use the Conservative and Stress scenarios to check how much cash is at risk.');
  if(actions.length<3)add('Confirm costs and delivery capacity','A missing operating cost or overstated capacity can reverse the assessment.');
  const interpretations=[{section:'Market opportunity',finding:'Estimated obtainable demand is '+obtainableText(result.demand.expected.monthly_units)+' monthly sales.',meaning:'This is the demand estimate after the target profile, affordability, competition and capacity assumptions.',commercial_consequence:expansion.hard_stop_flags.some(f=>f.code==='MARKET_BELOW_BREAK_EVEN')?'The market estimate does not support the sales required to cover costs.':'The modelled market can support the break-even sales level, subject to the assumptions.',action:'Validate the customer and competitor assumptions before committing capital.'},{section:'Working capital',finding:'The Expected scenario has a modelled funding gap of '+Math.ceil(gap)+' '+(input.market?.currency||'currency units')+'.',meaning:'The funding gap measures additional opening cash required to avoid negative month-end balances.',commercial_consequence:gap>0?'The plan can run short of cash even when target sales appear profitable.':'No negative month-end balance is modelled; payment timing and unexpected costs remain risks.',action:gap>0?'Secure funding, reduce phased spending or improve collection timing, then re-run.':'Check the selected reserve and test weaker collections.'},{section:'Core operation and growth plan',finding:'Core operation: '+core.classification+'. Growth plan: '+expansion.classification+'.',meaning:'The core comparison excludes discretionary recurring growth and new setup investment, while keeping current debt and withdrawals.',commercial_consequence:core.score>expansion.score?'The growth plan increases the pressure on an otherwise stronger core operation.':'Both assessments depend on the same demand and cost evidence.',action:core.score>expansion.score?'Consider phasing the expansion and testing demand before increasing commitments.':'Confirm the assumptions with actual operating records or a small sales test.'}];
  return {model_version:VERSION,interpretations,market_results:result,model_confidence:modelConfidence,overall_score:expansion.score,overall_classification:expansion.classification,core_business_assessment:core,expansion_plan_assessment:expansion,scenario_results:full,investment_projection:projection,recommended_actions:actions.slice(0,5),configuration:CONFIG,provisional:true};
}
return {VERSION,CONFIG,market,confidence,assess};
});
