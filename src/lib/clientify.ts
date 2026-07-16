import { env } from './env';

/* Integración con el CRM Clientify.
   Empuja cada lead nuevo como contacto. Si no hay CLIENTIFY_API_TOKEN, no falla:
   registra y omite (degradación limpia). Requiere plan con acceso a API. */

const BASE = 'https://api.clientify.net/v1';

export interface CrmContact {
  email: string;
  name?: string;
  phone?: string;
  company?: string;
  source: 'scanner' | 'contacto';
  index?: number | null;
  temperature: number;
  tempLabel: string;
  url?: string;
  goal?: string;
  message?: string;
}

export async function pushToClientify(c: CrmContact): Promise<boolean> {
  const token = env('CLIENTIFY_API_TOKEN');
  if (!token) {
    console.log(`[clientify:dev] (sin CLIENTIFY_API_TOKEN) lead ${c.email}`);
    return false;
  }
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Token ${token}`,
  };

  const parts = (c.name || '').trim().split(/\s+/).filter(Boolean);
  const first = parts[0] || c.email.split('@')[0];
  const last = parts.slice(1).join(' ');

  const description = [
    `Origen: ${c.source === 'contacto' ? 'Formulario de contacto' : 'Scanner Optimiza'}`,
    c.url ? `Sitio: ${c.url}` : '',
    c.index != null ? `Índice Optimiza: ${c.index}/100` : '',
    `Temperatura: ${c.temperature} (${c.tempLabel})`,
    c.goal ? `Meta: ${c.goal}` : '',
    c.message ? `Mensaje: ${c.message}` : '',
  ].filter(Boolean).join('\n');

  const payload: Record<string, unknown> = {
    first_name: first,
    last_name: last,
    email: c.email,
    phone: c.phone || '',
    company: c.company || '',
    description,
  };

  try {
    const res = await fetch(`${BASE}/contacts/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    // 201 creado. 400 por email duplicado = el contacto ya existe → no es error.
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (res.status === 400 && /email|exist|duplic|unique/i.test(body)) {
        console.log(`[clientify] contacto ya existía: ${c.email}`);
        return true;
      }
      console.error('[clientify] error', res.status, body.slice(0, 200));
      return false;
    }

    const data: any = await res.json().catch(() => null);
    const id = data?.id;
    // Etiquetas para segmentar en el CRM (endpoint dedicado).
    if (id) {
      const tags = ['Optimiza', c.source === 'contacto' ? 'Contacto' : 'Scanner', c.tempLabel];
      await Promise.all(
        tags.map((name) =>
          fetch(`${BASE}/contacts/${id}/tags/`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name }),
          }).catch(() => {})
        )
      );
    }
    return true;
  } catch (e) {
    console.error('[clientify] fetch error', e);
    return false;
  }
}
