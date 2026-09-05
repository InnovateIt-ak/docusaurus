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

The messages above appear one by one, first to last: the diagram carries a
`' steps reveal` comment, and the build animates its messages in the order
they are written (see `src/remark/diagram-steps.mjs`). Without `reveal` the
messages light up in turn instead, the diagram staying complete. The same
comment steps the links of a component, deployment or C4 diagram — the
deployment diagram further down runs its `Rel()` calls in order, in the EU
blue rather than the default tangerine, from `' steps #004494`: a hex value
or a CSS colour name after the word picks the colour. The PDF plays no
animation and prints the whole exchange; a reader who asked for reduced
motion gets the same still figure, and the **Stop** button under a moving
diagram gives it to anyone. Activity diagrams and C4 *sequence* diagrams are not
grouped by PlantUML and stay still.

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