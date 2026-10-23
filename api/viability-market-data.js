/* Public, read-only World Bank snapshots. No user business inputs leave this API. */
const COUNTRIES=Object.freeze({MUS:'MUR',ZAF:'ZAR',GBR:'GBP',USA:'USD',FRA:'EUR'});
const INDICATORS=['SP.POP.TOTL','NY.GNP.PCAP.PP.CD','NY.GDP.PCAP.PP.CD','PA.NUS.PPP'];
function parseSnapshot(payload,country,now=new Date()){
  if(!Array.isArray(payload)||!Array.isArray(payload[1]))throw new Error('Invalid public data response');
  const rows=payload[1].filter(r=>r.countryiso3code===country&&INDICATORS.includes(r.indicator?.id)&&Number.isFinite(r.value)&&r.value>0&&/^\d{4}$/.test(r.date)&&Number(r.date)<=now.getUTCFullYear());
  function observation(code,year){const r=rows.filter(r=>r.indicator.id===code&&(year===undefined||Number(r.date)===year)).sort((a,b)=>Number(b.date)-Number(a.date))[0];return r?{indicator:code,value:r.value,year:Number(r.date),source:'World Bank World Development Indicators',url:'https://data.worldbank.org/indicator/'+code+'?locations='+country}:null;}
  const commonYears=rows.filter(r=>r.indicator.id==='NY.GNP.PCAP.PP.CD').map(r=>Number(r.date)).filter(y=>observation('PA.NUS.PPP',y)).sort((a,b)=>b-a);
  const year=commonYears[0];
  return {country,currency:COUNTRIES[country],retrieved_at:now.toISOString(),source:'World Bank WDI',population:observation('SP.POP.TOTL'),gni_ppp:year===undefined?null:observation('NY.GNP.PCAP.PP.CD',year),ppp_conversion:year===undefined?null:observation('PA.NUS.PPP',year),gdp_ppp:observation('NY.GDP.PCAP.PP.CD'),complete_income_pair:year!==undefined};
}
async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
  const country=String(req.query?.country||'').toUpperCase();
  if(!Object.hasOwn(COUNTRIES,country))return res.status(400).json({error:'Country not supported by this preview'});
  try{
    const year=new Date().getUTCFullYear();
    const url='https://api.worldbank.org/v2/country/'+country+'/indicator/'+INDICATORS.join(';')+'?source=2&format=json&date='+(year-10)+':'+year+'&per_page=1000';
    const response=await fetch(url,{signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error('Public data request failed');
    const snapshot=parseSnapshot(await response.json(),country);
    res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json(snapshot);
  }catch(error){res.setHeader('Cache-Control','no-store');return res.status(503).json({error:'Public data is unavailable. You can continue with explicit estimates or run the financial analysis only.'});}
}
module.exports=handler;module.exports.parseSnapshot=parseSnapshot;
