# Authentication


#include "_sections/level-1-context.md"
#include "_sections/level-2-components.md"

you can use a _folder to create reusable md

```
#include "_sections/level-1-context.md"
#include "_sections/level-2-components.md"
```

The full OIDC flow: [C4 Core Diagrams](https://github.com/plantuml-stdlib/C4-PlantUML/blob/master/samples/C4CoreDiagrams.md)

![Authentication flow](../plantuml/auth-flow.puml)

Refresh token detail:

```plantuml
@startuml
!include ../plantuml/_shared/eeas-skin.puml
title Refresh token race condition
...
@enduml
```



![timing](../plantuml/timing.puml)


![sequence-diagram](../plantuml/Sequence-Diagram.puml)
![deployment-diagram](../plantuml/deployment-diagram.puml)


```mermaid
flowchart LR
    A[Author writes<br/>Markdown + Mermaid] --> B[Docusaurus build]
    B --> C{Diagram type?}
    C -->|PlantUML| D[PlantUML server]
    C -->|Mermaid| E[Mermaid CLI / Chromium]
    D --> F[Inline SVG]
    E --> F
    F --> G[Static website]
    F --> H[WeasyPrint PDF]
```