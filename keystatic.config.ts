import { config, collection, singleton, fields } from '@keystatic/core';

const pageSeo = (label: string) =>
  fields.object(
    {
      metaTitle: fields.text({
        label: 'Meta título',
        validation: { length: { max: 65 } },
        description: 'Ideal 50–60 caracteres. Vacío = título por defecto de la página.',
      }),
      metaDescription: fields.text({
        label: 'Meta descripción',
        multiline: true,
        validation: { length: { max: 165 } },
        description: 'Ideal 150–160 caracteres. Vacío = descripción por defecto.',
      }),
      focusKeyword: fields.text({
        label: 'Palabra clave objetivo',
        description: 'La keyword principal que quieres posicionar con esta página.',
      }),
    },
    { label }
  );

export default config({
  storage: { kind: 'local' },
  ui: {
    brand: { name: 'Optimiza' },
  },
  collections: {
    analisis: collection({
      label: 'Análisis y Teardowns',
      slugField: 'title',
      path: 'src/content/analisis/*',
      format: { contentField: 'body' },
      columns: ['title', 'category', 'publishDate'],
      entryLayout: 'content',
      schema: {
        title: fields.slug({
          name: { label: 'Título', description: 'Título del análisis o teardown.' },
        }),
        category: fields.select({
          label: 'Categoría',
          options: [
            { label: 'Teardown', value: 'teardown' },
            { label: 'Investigación', value: 'investigacion' },
            { label: 'Nuestro sitio', value: 'nuestro-sitio' },
            { label: 'Conversión', value: 'conversion' },
          ],
          defaultValue: 'teardown',
        }),
        publishDate: fields.date({ label: 'Fecha de publicación', defaultValue: { kind: 'today' } }),
        draft: fields.checkbox({ label: 'Borrador', description: 'No se publica mientras esté marcado.', defaultValue: true }),
        excerpt: fields.text({
          label: 'Resumen',
          multiline: true,
          description: 'Aparece en la tarjeta y se usa como respaldo de la meta descripción.',
        }),
        cover: fields.image({
          label: 'Imagen de portada',
          directory: 'src/assets/analisis',
          publicPath: '/src/assets/analisis/',
        }),
        body: fields.markdoc({ label: 'Contenido' }),
        seo: fields.object(
          {
            metaTitle: fields.text({
              label: 'Meta título',
              description: 'Ideal 50–60 caracteres. Si se deja vacío, se usa el Título.',
              validation: { length: { max: 65 } },
            }),
            metaDescription: fields.text({
              label: 'Meta descripción',
              multiline: true,
              description: 'Ideal 150–160 caracteres. Si se deja vacío, se usa el Resumen.',
              validation: { length: { max: 165 } },
            }),
            focusKeyword: fields.text({
              label: 'Palabra clave objetivo',
              description: 'La keyword principal que quieres posicionar con esta página.',
            }),
            ogImage: fields.image({
              label: 'Imagen social (Open Graph)',
              directory: 'src/assets/og',
              publicPath: '/src/assets/og/',
            }),
            noindex: fields.checkbox({ label: 'No indexar (noindex)', defaultValue: false }),
          },
          { label: 'SEO', description: 'Metadatos para buscadores (Google) y redes sociales.' }
        ),
      },
    }),
  },
  singletons: {
    seo: singleton({
      label: 'SEO de las páginas',
      path: 'src/content/settings/seo',
      schema: {
        defaultOgImage: fields.image({
          label: 'Imagen social por defecto (Open Graph)',
          directory: 'src/assets/og',
          publicPath: '/src/assets/og/',
        }),
        home: pageSeo('Home'),
        servicios: pageSeo('Servicios'),
        nosotros: pageSeo('Nosotros'),
        analisis: pageSeo('Análisis (índice)'),
        contacto: pageSeo('Contacto'),
      },
    }),
  },
});
