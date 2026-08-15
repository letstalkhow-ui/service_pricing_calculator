(function(){
  const serviceSection=document.querySelector('[data-guide="1"]');
  const monthlySection=document.querySelector('[data-guide="3"]');
  if(!serviceSection && !monthlySection) return;

  const style=document.createElement('style');
  style.textContent=`
    .cost-helper{margin:0 0 18px;border:1px solid #e5dfd2;border-radius:12px;background:#fffdf7;overflow:hidden}
    .cost-helper-toggle{width:100%;border:0;background:transparent;color:#111;padding:13px 14px;font-weight:800;text-align:left;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;outline:none}
    .cost-helper-toggle:focus,.cost-helper-toggle:focus-visible{outline:none!important;box-shadow:none!important}
    .cost-helper-toggle span:last-child{font-size:18px;line-height:1}
    .cost-helper-body{display:none;padding:0 14px 14px;color:#555;font-size:13px;line-height:1.55}
    .cost-helper.open .cost-helper-body{display:block}
    .cost-helper-body strong{color:#111}
    .cost-helper-body ul{margin:10px 0 0;padding-left:18px}
    .cost-helper-body li{margin:5px 0}
    @media(max-width:560px){
      .cost-helper{margin-bottom:16px}
      .cost-helper-toggle{padding:13px;font-size:13px}
      .cost-helper-body{padding:0 13px 13px;font-size:13px}
    }
  `;
  document.head.appendChild(style);

  function addHelper(section,title,body){
    if(!section || section.querySelector('.cost-helper')) return;

    const helper=document.createElement('div');
    helper.className='cost-helper';
    helper.innerHTML=`
      <button type="button" class="cost-helper-toggle" aria-expanded="false">
        <span>${title}</span>
        <span aria-hidden="true">+</span>
      </button>
      <div class="cost-helper-body">${body}</div>
    `;

    const head=section.querySelector('.section-head');
    if(head) head.insertAdjacentElement('afterend',helper);
    else section.prepend(helper);

    const toggle=helper.querySelector('.cost-helper-toggle');
    const icon=toggle.querySelector('span:last-child');
    toggle.addEventListener('click',()=>{
      const open=helper.classList.toggle('open');
      toggle.setAttribute('aria-expanded',String(open));
      icon.textContent=open?'−':'+';
    });
  }

  addHelper(
    serviceSection,
    'Not sure what counts as a service cost? Help me identify it.',
    `<strong>Only include costs that happen because you deliver this service.</strong>
      <ul>
        <li>Materials or products used for the job</li>
        <li>Printing or packaging</li>
        <li>Transport or delivery for this job</li>
        <li>Freelancer or subcontractor fees</li>
        <li>Equipment hired specifically for this job</li>
        <li>Other costs you would not pay if this service was not delivered</li>
      </ul>
      <p><strong>Do not include regular monthly expenses here.</strong> Rent, internet, salaries, software, insurance and marketing belong in Section 4.</p>
      <p>If a cost does not apply to your service, leave it out. Do not guess a number just to fill the calculator.</p>`
  );

  addHelper(
    monthlySection,
    'Not sure what counts as a monthly business expense? Help me identify it.',
    `<strong>Include the regular costs of keeping your business running each month.</strong>
      <ul>
        <li>Rent or workspace costs</li>
        <li>Internet, phone and utilities</li>
        <li>Employee salaries or regular staff costs</li>
        <li>Software and subscriptions used by the business</li>
        <li>Marketing and advertising</li>
        <li>Accounting, insurance and administration</li>
        <li>Other regular expenses you pay even when no client work is delivered</li>
      </ul>
      <p><strong>Use a monthly amount.</strong> If you pay something yearly, divide it by 12. If the amount changes from month to month, use a reasonable recent monthly average.</p>
      <p><strong>Do not add direct service costs again here.</strong> Materials, job-specific transport, freelancer fees or equipment hired for one service belong in Section 2.</p>
      <p>If you are unsure of the exact amount, check your recent bank statements, invoices or accounting records before entering a figure. Avoid guessing if you can verify it.</p>`
  );
})();
