let publicMarketSnapshot=null,marketDataRequest=0;
const MARKET_COUNTRIES={Mauritius:'MUS','South Africa':'ZAF','United Kingdom':'GBR','United States':'USA',France:'FRA'};
function readMarketInput(){
  const frequency={'Once':1,'Once a year':1,'A few times a year':4,'Monthly':12,'Every 2 weeks':26,'Weekly':52,'Several times a week':156};
  const maturity={'Idea only':'new','Preparing to launch':'new','Running less than 1 year':'early','Running 1–3 years':'established','Running more than 3 years':'established'};
  const competitors=el('competitors').value==='unknown'?5:num('competitors');
  const country=MARKET_COUNTRIES[el('country').value];
  const unknownIds=['competitors','dominant','different','priceCompare','pricePosition','importance','locality','staffTime','otherRevenue','ramp','investmentTiming','alternative'];
  const unknown=unknownIds.filter(id=>el(id).value==='unknown'||el(id).value==='I’m not sure').length;
  return {country,currency:el('currency').value,customerType:el('customerType').value==='Individuals or families'?'b2c':el('customerType').value==='Businesses'?'b2b':'mixed',
    population:el('marketPopulation').value,populationScope:el('reach').value==='Across the country'?'country':'local',populationSource:el('marketPopulationSource').value,populationYear:el('marketPopulationYear').value?num('marketPopulationYear'):null,
    targetPct:el('marketTargetExact').value!==''?num('marketTargetExact'):el('marketTargetPct').value,serviceablePct:el('marketServiceable').value,
    affordabilityPct:el('marketAffordability').value,sharePct:el('marketShare').value,volumeBasis:el('marketVolumeBasis').value,purchasesPerYear:frequency[el('frequency').value],competitors,
    maturity:maturity[el('stage').value],differentiation:{'Very similar':'similar','A little different':'some','Clearly different':'clear','I’m not sure':'unknown'}[el('different').value],
    access:{'No audience yet':'none','Small network or following':'small','Existing customers':'existing','Strong customer base or sales channel':'strong'}[el('access').value],
    dominance:{No:'no','A little':'some',Yes:'yes','I’m not sure':'unknown'}[el('dominant').value],
    pricePosition:{Lower:'lower','About the same':'same',Higher:'higher','I’m not sure':'unknown'}[el('priceCompare').value],
    substitution:el('alternative').value==='No obvious alternative'?'low':['Do nothing or wait','Buy a cheaper alternative','Stay with an existing provider'].includes(el('alternative').value)?'high':'moderate',
    profile:el('profile').value.toLowerCase(),evidence:el('marketEvidence').value,unknownCount:unknown,
    snapshot:publicMarketSnapshot?.country===country?publicMarketSnapshot:null};
}
async function loadMarketData(){
  const country=MARKET_COUNTRIES[el('country').value],request=++marketDataRequest;
  if(!country){el('marketDataStatus').textContent='Country data is not supported for this selection. You can enter explicit assumptions or run financial results only.';publicMarketSnapshot=null;return;}
  el('marketDataStatus').textContent='Loading World Bank country data…';
  try{
    const response=await fetch('/api/viability-market-data?country='+country,{signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error('Data unavailable');
    const data=await response.json();if(request!==marketDataRequest||MARKET_COUNTRIES[el('country').value]!==country)return;
    if(data.country!==country)throw new Error('Country mismatch');publicMarketSnapshot=data;
    const values=[data.population?'Population: '+Math.round(data.population.value).toLocaleString()+' ('+data.population.year+')':'Population unavailable',data.gni_ppp?'Purchasing-power income and conversion: '+data.gni_ppp.year:'Comparable income data unavailable'];
    el('marketDataStatus').textContent='World Bank WDI. '+values.join('. ')+'. Local area estimates are still required for local markets.';
  }catch(error){if(request!==marketDataRequest||MARKET_COUNTRIES[el('country').value]!==country)return;publicMarketSnapshot=null;el('marketDataStatus').textContent='Country data could not be loaded. No substitute figures were invented. Enter explicit estimates if you have them, or continue with financial results only.';}
  el('preview').classList.remove('active');if(currentStep===7)renderMarketReview();
}
function renderMarketReview(){
  const m=readMarketInput(),text=[];
  text.push(m.population?'Area population: '+Number(m.population).toLocaleString()+', supplied by you.':m.populationScope==='country'&&m.snapshot?.population?'National population: '+m.snapshot.population.value.toLocaleString()+' ('+m.snapshot.population.year+', World Bank).':'Area population is unknown.');
  text.push(m.targetPct!==''?'Target-customer share: '+m.targetPct+'%.':'Target-customer share is unknown.');
  text.push('Share you can reach within the area: '+(m.serviceablePct===''?'80 (default)':m.serviceablePct)+'%.');
  text.push(m.affordabilityPct!==''?'Affordability: '+m.affordabilityPct+'%, your assumption.':m.snapshot?.complete_income_pair?'Affordability will use same-year GNI and PPP data ('+m.snapshot.gni_ppp.year+').':'Comparable income data is not loaded. Use “Load country data” in Step 2, or supply an affordability estimate if you have evidence.');
  text.push('Competitor buckets use representative counts: 1–2 → 2; 3–5 → 5; 6–10 → 8; more than 10 → 12; unknown → 5. These are assumptions, not a competitor census.');
  text.push('Maturity, customer access, differentiation, price and dominant competition adjust attainable share. Positioning and purchase importance are context, not additional hidden affordability penalties.');
  el('marketReview').innerHTML='<ul>'+text.map(t=>'<li>'+escapeHtml(t)+'</li>').join('')+'</ul>';
}
function renderMarketResults(){
  const a=marketAssessment,m=a.market_results,c=a.model_confidence;
  let blocks='';
  if(m.status!=='ready'){
    blocks='<h3>Market assessment incomplete</h3><p>'+escapeHtml(m.reason||'Still needed: '+m.missing.join('; '))+'.</p><p><strong>Confidence: '+escapeHtml(c.level)+'</strong>. Financial analysis remains available, but no overall viability score is assigned.</p>';
    el('marketDimensions').innerHTML='';
  }else{
    const core=a.core_business_assessment,growth=a.expansion_plan_assessment;
    const percent=v=>v===null?'Not available':(v*100).toFixed(1)+'%';
    const coverage=v=>v===null?'Not needed or unavailable':v.toFixed(2)+'×';
    blocks='<h3>Provisional planning assessment: '+escapeHtml(a.overall_classification)+'</h3><p><strong>Score: '+a.overall_score+'/100 · Confidence: '+escapeHtml(c.level)+'</strong></p>'+[
      ['Core operation',core.classification+' ('+core.score+'/100), excluding discretionary growth and setup spending. Existing debt and owner drawings remain in the core cash comparison.'],
      ['Growth plan',growth.classification+' ('+growth.score+'/100), including the planned growth costs and investment timing.'],
      ['Market opportunity','Broad eligible buyers after affordability: '+Math.round(m.tam_customers).toLocaleString()+'. Reachable buyers: '+Math.round(m.sam_customers).toLocaleString()+'. Modelled obtainable monthly sales: '+m.demand.expected.monthly_units.toFixed(1)+'.'],
      ['Break-even feasibility','Required share of reachable buyers: '+percent(growth.required_market_share)+'. Modelled attainable share: '+percent(m.expected_share)+'. Demand coverage of break-even: '+coverage(growth.break_even_coverage)+'.'],
      ['What this means',growth.hard_stop_flags.filter(f=>f.ceiling!==null).map(f=>f.reason).join(' ')||'The model passes the current financial and market checks under the stated assumptions. This is not proof of future demand.'],
      ['Why it matters','A profitable sales target only helps if enough paying customers can be reached and cash lasts long enough to deliver the plan.'],
      ['What to do next',a.recommended_actions.map(r=>r.action+': '+r.reason).join(' ')],
      ['Planning limits','Score mappings and competition multipliers are provisional calibration choices. Model Confidence describes evidence quality and does not change the viability score. The 36-month investment projection holds post-ramp assumptions constant; final calibration and launch validation are still pending.']
    ].map(([h,t])=>'<p><strong>'+escapeHtml(h)+'</strong><br>'+escapeHtml(t)+'</p>').join('');
    const names={market:'Market Opportunity',unit:'Unit Economics',breakEven:'Break-Even Feasibility',capacity:'Capacity Feasibility',resilience:'Scenario Resilience'};
    el('marketDimensions').innerHTML=cashTable('Five viability dimensions: growth plan',['Dimension','Weight','Score','What it tests'],growth.dimensions.map(d=>[names[d.key],d.weight+'%',d.score+'/100',d.reason]));
  }
  el('marketResult').innerHTML=blocks;
  const sources=m.sources?.map(s=>s.metric+': '+s.value+'; '+s.source+'; reference year '+(s.year||'not supplied')+(s.scope?'; scope '+s.scope:'')+'.')||[];
  const notes=[...(m.assumptions||[]),...sources,...c.reasons,'Competition range: Conservative uses 65%, Expected 100%, Strong 135% and Stress 40% of modelled attainable share; each is bounded by market and capacity. These are planning ranges, not statistical confidence intervals.'];
  if(m.public_data_snapshot){notes.push('Country snapshot retrieved: '+m.public_data_snapshot.retrieved_at+'. Public values retain their individual reference years.');const gdp=m.public_data_snapshot.gdp_ppp;if(gdp)notes.push('Supporting GDP per person at PPP: '+gdp.value+' current international dollars ('+gdp.year+'). This is macroeconomic context, not a customer budget or an extra scoring input.');}
  el('marketAssumptions').innerHTML=notes.map(t=>'<li>'+escapeHtml(t)+'</li>').join('')+(m.sources||[]).filter(s=>s.url?.startsWith('https://data.worldbank.org/indicator/')).map(s=>'<li><a href="'+escapeHtml(s.url)+'" target="_blank" rel="noopener noreferrer">World Bank source: '+escapeHtml(s.metric)+'</a></li>').join('');
}
