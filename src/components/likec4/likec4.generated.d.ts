/* prettier-ignore-start */
/* eslint-disable */

/******************************************************************************
 * This file was generated
 * DO NOT EDIT MANUALLY!
 ******************************************************************************/

import type { PropsWithChildren } from 'react'
import type { JSX } from 'react/jsx-runtime'
import type { LikeC4Model } from '@likec4/core/model'
import type { DiagramView } from '@likec4/core/types'
import type {
  LikeC4ViewProps as GenericLikeC4ViewProps,
  ReactLikeC4Props as GenericReactLikeC4Props
} from 'likec4/react'

import type { Aux, SpecAux } from '@likec4/core/types';

export type $Specs = SpecAux<
  // Element kinds
  | "actor"
  | "application"
  | "component"
  | "database"
  | "db_table"
  | "external-system"
  | "mobile"
  | "service"
  | "system"
  | "webapp",
  // Deployment kinds
  | "environment"
  | "internet"
  | "vm",
  // Relationship kinds
  | "solid",
  // Tags
  | "deprecated"
  | "next"
  | "teamA"
  | "teamB"
  | "v1"
  | "v1_1"
  | "v2",
  // Metadata keys
  | "npm"
  | "version"
>

export type $Aux = Aux<
  "layouted",
  // Elements
  | "boutique"
  | "customer"
  | "email-provider"
  | "payment-gateway"
  | "boutique.actionLog"
  | "boutique.cart"
  | "boutique.catalogue"
  | "boutique.checkout"
  | "boutique.db"
  | "boutique.email"
  | "boutique.frontend"
  | "boutique.payments"
  | "boutique.shipping"
  | "boutique.cart.api"
  | "boutique.cart.cache"
  | "boutique.db.orders"
  | "boutique.db.products"
  | "boutique.db.users"
  | "boutique.frontend.catalogue"
  | "boutique.frontend.checkout"
  | "boutique.frontend.profile"
  | "boutique.payments.currency"
  | "boutique.payments.processor",
  // Deployments
  | "dev"
  | "internet"
  | "prod"
  | "dev.containers"
  | "dev.developer"
  | "dev.devmachine"
  | "internet.customer"
  | "prod.appvms"
  | "prod.dbvm1"
  | "prod.dbvm2"
  | "prod.vm1"
  | "prod.vm2"
  | "dev.containers.db"
  | "dev.containers.payments"
  | "dev.containers.shipping"
  | "dev.devmachine.cart"
  | "dev.devmachine.catalogue"
  | "dev.devmachine.checkout"
  | "dev.devmachine.frontend"
  | "prod.appvms.checkout"
  | "prod.appvms.payments"
  | "prod.appvms.shipping"
  | "prod.dbvm1.db"
  | "prod.dbvm2.db"
  | "prod.vm1.cart"
  | "prod.vm1.catalogue"
  | "prod.vm1.frontend"
  | "prod.vm2.cart"
  | "prod.vm2.catalogue"
  | "prod.vm2.frontend",
  // Views
  | "actionLog"
  | "boutique"
  | "cart"
  | "catalogue"
  | "checkout"
  | "customer"
  | "database"
  | "development-env"
  | "frontend"
  | "index"
  | "order-fulfillment"
  | "payments"
  | "place-order"
  | "production-env"
  | "shipping",
  // Project ID
  "default",
  $Specs
>

export type $ElementId = $Aux['ElementId']
export type $DeploymentId = $Aux['DeploymentId']
export type $ViewId = $Aux['ViewId']

export type $ElementKind = $Aux['ElementKind']
export type $RelationKind = $Aux['RelationKind']
export type $DeploymentKind = $Aux['DeploymentKind']
export type $Tag = $Aux['Tag']
export type $Tags = readonly $Aux['Tag'][]
export type $MetadataKey = $Aux['MetadataKey']


declare function isLikeC4ViewId(value: unknown): value is $ViewId;

declare const likec4model: LikeC4Model<$Aux>;
declare function useLikeC4Model(): LikeC4Model<$Aux>;
declare function useLikeC4View(viewId: $ViewId): DiagramView<$Aux>;

declare function LikeC4ModelProvider(props: PropsWithChildren): JSX.Element;

type IconRendererProps = {
  node: {
    id: string
    title: string
    icon?: string | undefined
  }
}
declare function RenderIcon(props: IconRendererProps): JSX.Element;

type LikeC4ViewProps = GenericLikeC4ViewProps<$Aux>;
declare function LikeC4View({viewId, ...props}: LikeC4ViewProps): JSX.Element;

type ReactLikeC4Props = GenericReactLikeC4Props<$Aux>
declare function ReactLikeC4({viewId, ...props}: ReactLikeC4Props): JSX.Element;

export {
  type LikeC4ViewProps,
  type ReactLikeC4Props,
  isLikeC4ViewId,
  useLikeC4Model,
  useLikeC4View,
  likec4model,
  LikeC4ModelProvider,
  LikeC4View,
  RenderIcon,
  ReactLikeC4
}
/* prettier-ignore-end */
