import {defaultVPC} from './src/vpc';
import {argoTunnel} from './src/instances'
import './src/billing'
import './src/logging'
import {serviceUri} from './src/services/mycontainer'

export const url = serviceUri
export const vpcid = defaultVPC
export const argoTunne = argoTunnel
