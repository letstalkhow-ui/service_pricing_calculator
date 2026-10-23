// One-time sandbox callback registration completed on 23 October 2026.
// Retain JWT protection and disable registration unconditionally after setup.
Deno.serve(() => Response.json({error:'Setup disabled'},{status:503,headers:{'Cache-Control':'no-store'}}));
