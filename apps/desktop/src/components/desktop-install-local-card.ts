/** Presentation for an install offer or an already-selected local runtime. */
export type LocalCardState = 'none' | 'installed' | 'bundled' | 'remote-only'

export interface LocalCardPresentation {
  /** i18n key into `t.install` for the card title. */
  title: 'installLocalTitle' | 'useLocalTitle'
  /** i18n key into `t.install` for the card body. */
  desc: 'installLocalDesc' | 'useLocalDesc' | 'bundledLocalDesc'
  /** Whether the "Will install to <root>" footer is accurate for this state. */
  showInstallTo: boolean
  /** CORTA CUSTOMIZATION: whether a local card is offered at all (false for the remote-only Light client). */
  offered: boolean
  /** i18n key into `t.install` for the setup-choice subtitle. */
  subtitle: 'setupChoiceDesc' | 'setupChoiceDescLocal' | 'remoteSetupDesc'
}

export function localCardPresentation(local: LocalCardState | undefined): LocalCardPresentation {
  switch (local) {
    case 'installed':
      return {
        title: 'useLocalTitle',
        desc: 'useLocalDesc',
        showInstallTo: false,
        offered: true,
        subtitle: 'setupChoiceDescLocal'
      }

    case 'bundled':
      return {
        title: 'useLocalTitle',
        desc: 'bundledLocalDesc',
        showInstallTo: false,
        offered: true,
        subtitle: 'setupChoiceDescLocal'
      }

    case 'remote-only':
      return {
        title: 'installLocalTitle',
        desc: 'installLocalDesc',
        showInstallTo: false,
        offered: false,
        subtitle: 'remoteSetupDesc'
      }

    case 'none':

    default:
      return {
        title: 'installLocalTitle',
        desc: 'installLocalDesc',
        showInstallTo: true,
        offered: true,
        subtitle: 'setupChoiceDesc'
      }
  }
}
