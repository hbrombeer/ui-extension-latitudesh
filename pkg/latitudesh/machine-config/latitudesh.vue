<script>
import Loading from '@shell/components/Loading';
import CreateEditView from '@shell/mixins/create-edit-view';
import { LabeledInput } from '@components/Form/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { Banner } from '@components/Banner';
import { exceptionToErrorsArray } from '@shell/utils/error';

// Latitude.sh API base URL (proxied through Rancher)
const API_PROXY = '/meta/proxy/api.latitude.sh';

export default {
  components: {
    Loading, LabeledInput, LabeledSelect, Banner,
  },

  mixins: [CreateEditView],

  emits: ['validationChanged'],

  props: {
    // The cloud credential ID selected by the user
    credentialId: {
      type:     String,
      required: true,
    },

    // The machine config resource object (v-model bound)
    value: {
      type:     Object,
      required: true,
    },

    // Disable controls during save operations
    busy: {
      type:    Boolean,
      default: false,
    },

    // Component mode: 'create', 'edit', or 'view'
    mode: {
      type:     String,
      required: true,
    },

    // Disable all controls
    disabled: {
      type:    Boolean,
      default: false,
    },

    // Provider name
    provider: {
      type:    String,
      default: 'latitudesh',
    },
  },

  // ── Async data loading ─────────────────────────────────────────────────
  async fetch() {
    this.errors = [];

    if (!this.credentialId) {
      return;
    }

    try {
      // Load the credential to get the token for API calls
      this.credential = await this.$store.dispatch('rancher/find', {
        type: 'cloudCredential',
        id:   this.credentialId,
      });
    } catch (e) {
      // User might not have permission to view the credential directly.
      // We can still use the proxy with credentialId.
      this.credential = null;
    }

    try {
      // Fetch all dropdown data in parallel from the Latitude.sh API
      const [projectsRes, regionsRes, plansRes, osRes, sshKeysRes, userDataRes] = await Promise.all([
        this.latitudeGet('/projects?page[size]=100'),
        this.latitudeGet('/regions?page[size]=100'),
        this.latitudeGet('/plans?filter[in_stock]=true&page[size]=100'),
        this.latitudeGet('/plans/operating_systems?page[size]=100'),
        this.latitudeGet('/ssh_keys?page[size]=100'),
        this.latitudeGet('/user_data?page[size]=100'),
      ]);

      // ── Map Projects ───────────────────────────────────────────────────
      this.projectOptions = (projectsRes.data || []).map((p) => ({
        label: `${ p.attributes.name } (${ p.attributes.slug || p.id })`,
        value: p.attributes.slug || p.id,
      }));

      // ── Map Regions ────────────────────────────────────────────────────
      this.regionOptions = (regionsRes.data || []).map((r) => {
        const a = r.attributes;
        const country = a.country?.name || '';
        let label = a.slug;

        if (a.name && a.name !== a.slug) {
          label += ` \u2013 ${ a.name }`;
        }
        if (country) {
          label += ` (${ country })`;
        }

        return { label, value: a.slug };
      });

      // ── Map Plans ──────────────────────────────────────────────────────
      this.planOptions = (plansRes.data || []).map((p) => {
        const a = p.attributes;
        const specs = a.specs || {};
        const cpu = specs.cpu || {};
        const mem = specs.memory || {};
        const drives = specs.drives || [];
        const pricing = a.pricing || {};
        const usd = pricing.USD || {};

        const parts = [a.name || a.slug];

        if (cpu.type) {
          parts.push(`${ cpu.type }${ cpu.cores ? ` (${ cpu.cores }c)` : '' }`);
        }
        if (mem.total) {
          parts.push(`${ mem.total } GB RAM`);
        }
        if (drives.length > 0) {
          const diskStr = drives.map((d) => `${ d.count || 1 }x ${ d.size || '' } ${ d.type || '' }`).join(', ');

          parts.push(diskStr);
        }
        if (usd.hour) {
          parts.push(`$${ usd.hour }/hr`);
        }

        return { label: parts.join(' \u2013 '), value: a.slug };
      });

      // ── Map Operating Systems ──────────────────────────────────────────
      this.osOptions = (osRes.data || []).map((o) => {
        const a = o.attributes;
        let label = '';

        if (a.distro) {
          label = a.distro;
          if (a.version) {
            label += ` ${ a.version }`;
          }
        } else {
          label = a.name || a.slug;
        }

        return { label, value: a.slug };
      });

      // ── Map SSH Keys ───────────────────────────────────────────────────
      this.sshKeyOptions = [
        { label: 'None (driver will generate a key)', value: '' },
        ...(sshKeysRes.data || []).map((k) => ({
          label: `${ k.attributes.name } (${ k.attributes.fingerprint || '' })`,
          value: k.id,
        })),
      ];

      // ── Map User Data ──────────────────────────────────────────────────
      this.userDataOptions = [
        { label: 'None', value: '' },
        ...(userDataRes.data || []).map((u) => ({
          label: u.attributes.description || u.id,
          value: u.id,
        })),
      ];

      // Set sensible defaults for new machine configs
      if (this.isCreate) {
        if (!this.value.project && this.projectOptions.length > 0) {
          this.value.project = this.projectOptions[0].value;
        }
        if (!this.value.os && this.osOptions.length > 0) {
          // Default to Ubuntu 22.04 if available, else first option
          const ubuntu = this.osOptions.find((o) => o.value.includes('ubuntu_22'));

          this.value.os = ubuntu ? ubuntu.value : this.osOptions[0].value;
        }
      }
    } catch (e) {
      this.errors = exceptionToErrorsArray(e);
    }
  },

  data() {
    return {
      credential:      null,
      errors:          [],
      projectOptions:  [],
      regionOptions:   [],
      planOptions:     [],
      osOptions:       [],
      sshKeyOptions:   [],
      userDataOptions: [],
    };
  },

  watch: {
    // Refetch all data when the credential changes
    credentialId() {
      this.$fetch();
    },

    // Emit validation status whenever required fields change
    'value.project'()  { this.emitValidation(); },
    'value.region'()   { this.emitValidation(); },
    'value.plan'()     { this.emitValidation(); },
    'value.os'()       { this.emitValidation(); },
  },

  computed: {
    isView() {
      return this.mode === 'view';
    },

    isCreate() {
      return this.mode === 'create';
    },

    isDisabled() {
      return this.disabled || this.busy || this.isView;
    },
  },

  methods: {
    // Make an authenticated request to the Latitude.sh API via Rancher proxy
    async latitudeGet(path) {
      const url = `${ API_PROXY }${ path }`;

      const res = await fetch(url, {
        headers: {
          'X-Api-CattleAuth-Header': `Bearer credId=${ this.credentialId } tokenField=apiToken`,
          'Accept':                   'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Latitude.sh API error: ${ res.status } ${ res.statusText }`);
      }

      return await res.json();
    },

    // Emit whether the current config is valid
    emitValidation() {
      const valid = !!(
        this.value.project &&
        this.value.region &&
        this.value.plan &&
        this.value.os
      );

      this.$emit('validationChanged', valid);
    },
  },
};
</script>

<template>
  <Loading v-if="$fetchState.pending" />
  <div v-else>
    <!-- Error banner -->
    <Banner
      v-if="errors.length"
      color="error"
      :closable="true"
      @close="errors = []"
    >
      <ul class="mb-0">
        <li
          v-for="(err, idx) in errors"
          :key="idx"
        >
          {{ err }}
        </li>
      </ul>
    </Banner>

    <!-- Project -->
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model="value.project"
          :label="t('cluster.machineConfig.latitudesh.project.label')"
          :placeholder="t('cluster.machineConfig.latitudesh.project.placeholder')"
          :options="projectOptions"
          :disabled="isDisabled"
          :mode="mode"
          required
        />
      </div>
    </div>

    <!-- Region -->
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model="value.region"
          :label="t('cluster.machineConfig.latitudesh.region.label')"
          :placeholder="t('cluster.machineConfig.latitudesh.region.placeholder')"
          :options="regionOptions"
          :disabled="isDisabled"
          :mode="mode"
          required
        />
      </div>
    </div>

    <!-- Plan -->
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model="value.plan"
          :label="t('cluster.machineConfig.latitudesh.plan.label')"
          :placeholder="t('cluster.machineConfig.latitudesh.plan.placeholder')"
          :options="planOptions"
          :disabled="isDisabled"
          :mode="mode"
          required
        />
      </div>
    </div>

    <!-- Operating System -->
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model="value.os"
          :label="t('cluster.machineConfig.latitudesh.os.label')"
          :placeholder="t('cluster.machineConfig.latitudesh.os.placeholder')"
          :options="osOptions"
          :disabled="isDisabled"
          :mode="mode"
          required
        />
      </div>
    </div>

    <!-- Hostname -->
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledInput
          v-model="value.hostname"
          :label="t('cluster.machineConfig.latitudesh.hostname.label')"
          :placeholder="t('cluster.machineConfig.latitudesh.hostname.placeholder')"
          :disabled="isDisabled"
          :mode="mode"
        />
      </div>
    </div>

    <!-- SSH Key -->
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model="value.sshKey"
          :label="t('cluster.machineConfig.latitudesh.sshKey.label')"
          :placeholder="t('cluster.machineConfig.latitudesh.sshKey.placeholder')"
          :options="sshKeyOptions"
          :disabled="isDisabled"
          :mode="mode"
        />
      </div>
    </div>

    <!-- User Data -->
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledSelect
          v-model="value.userdata"
          :label="t('cluster.machineConfig.latitudesh.userdata.label')"
          :placeholder="t('cluster.machineConfig.latitudesh.userdata.placeholder')"
          :options="userDataOptions"
          :disabled="isDisabled"
          :mode="mode"
        />
      </div>
    </div>
  </div>
</template>
