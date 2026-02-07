<script>
import { LabeledInput } from '@components/Form/LabeledInput';

export default {
  components: { LabeledInput },

  props: {
    // The cloud credential value object (bound by Rancher)
    value: {
      type:     Object,
      required: true,
    },

    // Component mode: 'create', 'edit', or 'view'
    mode: {
      type:    String,
      default: 'create',
    },
  },

  computed: {
    isView() {
      return this.mode === 'view';
    },
  },

  watch: {
    'value.decodedData.token'(neu) {
      // Emit validation status whenever the token changes
      this.$emit('validationChanged', !!neu);
    },
  },
};
</script>

<template>
  <div>
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledInput
          :value="value.decodedData.token"
          :label="t('cluster.credential.latitudesh.token.label')"
          :placeholder="t('cluster.credential.latitudesh.token.placeholder')"
          type="password"
          :mode="mode"
          :disabled="isView"
          required
          @input="value.setData('token', $event)"
        />
        <p class="text-muted mt-5">
          {{ t('cluster.credential.latitudesh.token.help') }}
          <a
            href="https://www.latitude.sh/dashboard/settings/api-keys"
            target="_blank"
            rel="noopener noreferrer"
          >
            Latitude.sh Dashboard
          </a>
        </p>
      </div>
    </div>
  </div>
</template>
