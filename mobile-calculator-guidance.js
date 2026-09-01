(function () {
  const isCostEstimator = Boolean(document.querySelector('.progress-wrap'));
  document.documentElement.classList.add(isCostEstimator ? 'bb-cost-guidance' : 'bb-pricing-guidance');

  const style = document.createElement('style');
  style.textContent = `
    .bb-row-field{display:contents}
    .bb-row-field>span{display:none}
    .bb-pricing-guidance .inline-label{position:relative}
    .bb-pricing-guidance .tip:hover+.tiptext,
    .bb-pricing-guidance .tip:focus+.tiptext,
    .bb-pricing-guidance .tip.open+.tiptext{display:block}
    @media(max-width:560px){
      .bb-pricing-guidance .inline-label{display:grid;grid-template-columns:1fr 18px;width:100%;align-items:center}
      .bb-pricing-guidance .inline-label .tiptext{position:static;grid-column:1/-1;width:100%;max-width:none;margin-top:6px}
      .bb-pricing-guidance .bb-row-field{display:grid;grid-column:1;gap:5px}
      .bb-pricing-guidance .bb-row-field>span{display:block;font-size:11px;letter-spacing:.04em;color:#777}
    }
    @media(max-width:650px){
      .bb-cost-guidance .bb-row-field{display:grid;grid-column:1;gap:5px}
      .bb-cost-guidance .bb-row-field>span{display:block;font-size:11px;font-weight:800;letter-spacing:.04em;color:#777}
    }
  `;
  document.head.appendChild(style);

  function wrapFields(containerId, labels) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.row, .cost-row').forEach(row => {
      Array.from(row.querySelectorAll('input, select')).forEach((control, index) => {
        const field = labels[index];
        if (!field || control.closest('.bb-row-field')) return;
        const wrapper = document.createElement('label');
        wrapper.className = 'bb-row-field';
        const caption = document.createElement('span');
        caption.textContent = field;
        control.before(wrapper);
        wrapper.append(caption, control);
        if (control.tagName === 'INPUT' && !control.placeholder) control.placeholder = field;
        if (!control.getAttribute('aria-label')) control.setAttribute('aria-label', field);
      });
    });
  }

  function improveTooltips() {
    document.querySelectorAll('.tip').forEach(tip => {
      const explanation = tip.querySelector('.tiptext');
      if (explanation) tip.after(explanation);
    });
  }

  function enhanceRows() {
    if (isCostEstimator) {
      wrapFields('directRows', ['Cost', 'Quantity', 'Cost per unit']);
      wrapFields('monthlyRows', ['Expense', 'Amount', 'Frequency']);
    } else {
      wrapFields('directRows', ['Expense', 'Quantity', 'Cost each']);
      wrapFields('activityRows', ['Activity', 'Hours']);
      wrapFields('overheadRows', ['Expense', 'Monthly amount']);
    }
  }

  improveTooltips();
  enhanceRows();

  ['directRows', 'activityRows', 'overheadRows', 'monthlyRows'].forEach(id => {
    const container = document.getElementById(id);
    if (container) new MutationObserver(enhanceRows).observe(container, { childList: true });
  });
})();
