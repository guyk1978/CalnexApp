export async function exportToPdf(data: {
  calculatorName: string;
  inputs: Record<string, string>;
  results: Record<string, string>;
}) {
  const response = await fetch(
    'https://api.joinmypdf.com/generate-report',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error('PDF generation failed');
  }

  const blob = await response.blob();

  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'report.pdf';

  document.body.appendChild(a);
  a.click();

  a.remove();

  window.URL.revokeObjectURL(url);
}