const SeoModule = (() => {
  const setMeta = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) node.setAttribute("content", value);
  };

  const setLoanMeta = ({ amountText, term, unit, rate }) => {
    const title = `Loan Calculator - ${amountText} over ${term} ${unit} at ${rate}%`;
    const description = `Estimate monthly payment, total interest, and total repayment for ${amountText} over ${term} ${unit} at ${rate}%.`;
    const url = window.location.href;

    document.title = title;
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:url"]', url);
  };

  return { setLoanMeta };
})();
