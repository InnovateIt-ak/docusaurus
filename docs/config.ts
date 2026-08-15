export const REDOC_SPEC=[
    {
        spec: 'openapi/petstore.yaml',
        id: 'eeas-api',
        route: '/api/eeas-api-1',
    },
    {
        spec: 'openapi/petstore.yaml',
        id: 'eeas-api-2',
        route: '/api/eeas-api-2',
    },
]
export const NAV_BAR={
    title: process.env.G_PROJECT_NAME,
    logo: {
        alt: 'EEAS Logo',
        src: 'img/logo.svg',
    },
    items: [
        {
            type: 'docSidebar',
            sidebarId: 'guideSidebar',
            position: 'left',
            label: 'Guide',
        },
        {
            to: '/api/eeas-api-1',
            position: 'left',
            label: 'API Docs 1',
        },
        {
            to: '/api/eeas-api-2',
            position: 'left',
            label: 'API Docs2 ',
        },
        {to: '/likec4', label: 'Architecture', position: 'left'},
        {
            href: 'https://github.com/InnovateIt-ak/docusaurus',
            label: 'GitHub',
            position: 'right',
        }
    ],
}
export const FOOTER_CONFIG={
    style: 'dark',
    links: [],
    copyright: `Copyright © ${new Date().getFullYear()} EEAS Project. Built with Docusaurus.`,
}



