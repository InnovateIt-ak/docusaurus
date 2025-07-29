import { LikeC4View } from '../components/likec4/likec4.generated'
import Layout from "@theme/Layout";

const Likec4 = () => (
    <Layout
        title="Architecture Diagram"
        description="Diagramme d'architecture généré avec LikeC4"
    >
        <main>
            <div className="container margin-vert--lg">
                <LikeC4View viewId="index" />
            </div>
        </main>
    </Layout>
)
export default Likec4