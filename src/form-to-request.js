import url from 'url';

export default function formToRequest(form, baseUrl, params = {}) {
  const baseParams = {};
  form.serializeArray().forEach(({ name, value }) => {
    baseParams[name] = value;
  });
  return {
    url: url.resolve(baseUrl, form.attr('action') || ''),
    method: form.attr('method') || 'GET',
    form: Object.assign(baseParams, params),
  };
}
