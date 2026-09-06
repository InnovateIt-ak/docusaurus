// The OpenAPI references Redocly renders (Redocusaurus, docusaurus.config.ts):
// one page per spec in openapi/, at /api/<id>. The same specs are also read as
// data-model pages under docs/api/datamodel (plugins/openapi-schema-doc).
export const REDOC_SPEC=[
    {id: 'platform', spec: 'openapi/api-platform.yaml', route: '/api/platform'},
    {id: 'delegations', spec: 'openapi/delegations.yaml', route: '/api/delegations'},
    {id: 'petstore', spec: 'openapi/petstore.yaml', route: '/api/petstore'},
]
export const WELCOME_PAGE ={
    redirectUrl:"/docs/",
     message: null,
}
export const NAV_BAR={
    title: process.env.G_PROJECT_NAME
        .toLowerCase()
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
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
            // The API references (REDOC_SPEC above), one entry per spec.
            type: 'dropdown',
            label: 'API',
            position: 'left',
            to: '/api/platform',
            items: [
                {label: 'API Platform', to: '/api/platform'},
                {label: 'Delegations API', to: '/api/delegations'},
                {label: 'Petstore', to: '/api/petstore'},
            ],
        },
        {
            href: 'https://github.eeas.europa.eu',
            label: 'GitHub',
            position: 'right',
        },

    ],
}
export const FOOTER_CONFIG={
    style: 'dark',
    links: [
        {label: 'Repository', href: 'https://github.eeas.europa.eu'},
        {label: 'PDF exports', href: 'pathname:///documentation.pdf'},
    //     {
    //         title: 'Docs',
    //         items: [
    //             {
    //                 label: 'Tutorial',
    //                 to: '/docs/intro',
    //             },
    //             {
    //                 label: 'Tests',
    //                 to: '/docs/intro',
    //             },
    //             {
    //                 label: 'API Documentation',
    //                 to: '/api',
    //             },
    //         ],
    //     },
    //     {
    //         title: 'Community',
    //         items: [
    //             {
    //                 label: 'Stack Overflow',
    //                 href: 'https://stackoverflow.com/questions/tagged/docusaurus',
    //             },
    //             {
    //                 label: 'Discord',
    //                 href: 'https://discordapp.com/invite/docusaurus',
    //             },
    //             {
    //                 label: 'X',
    //                 href: 'https://x.com/docusaurus',
    //             },
    //         ],
    //     },
    ],
    copyright: `Copyright © ${new Date().getFullYear()} EEAS Project. Built with Docusaurus.`,
}
