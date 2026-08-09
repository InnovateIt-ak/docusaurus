export const REDOC_SPEC=[]
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
            href: 'https://github.eeas.europa.eu',
            label: 'GitHub',
            position: 'right',
        },

    ],
}
export const FOOTER_CONFIG={
    style: 'dark',
    links: [
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
