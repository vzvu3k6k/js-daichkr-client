import url from 'url';

export default function formToRequest(form, baseUrl, params = {}) {
  const baseParams = {};
  for (const { name, value } of form.serializeArray()) {
    baseParams[name] = value;
  }
  return {
    url: url.resolve(baseUrl, form.attr('action') || ''),
    method: form.attr('method') || 'GET',
    form: Object.assign(baseParams, params),
  };
}
