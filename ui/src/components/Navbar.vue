<template>
  <div>
    <nav class="bg-gray-800">
      <div class="mx-auto px-2 sm:px-6 lg:px-8">
        <div class="relative flex items-center justify-between h-16">
          <div class="inset-y-0 left-0 flex items-center lg:hidden">
            <!-- Mobile menu button-->
            <button
              class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              :aria-expanded="menuIsOpened"
              @click="toggleMenu"
            >
              <span class="sr-only">Open main menu</span>
              <!-- Icon when menu is closed. -->
              <!--
              Heroicon name: outline/menu

              Menu open: "hidden", Menu closed: "block"
            -->
              <svg
                v-if="!menuIsOpened"
                class="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <!-- Icon when menu is open. -->
              <!--
              Heroicon name: outline/x

              Menu open: "block", Menu closed: "hidden"
            -->
              <svg
                v-if="menuIsOpened"
                class="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div
            class="flex-1 flex items-center justify-center sm:items-stretch sm:justify-start"
          >
            <div class="flex-shrink-0 flex items-center">
              <img
                class="hidden lg:block h-8 w-auto"
                src="https://tailwindui.com/img/logos/workflow-mark-indigo-500.svg"
                alt="Workflow"
              >
            </div>
            <div class="hidden lg:block sm:ml-6">
              <div class="flex space-x-2">
                <router-link
                  v-for="entry in entries"
                  :key="entry.to"
                  :to="entry.to"
                  :exact="entry.exact"
                  active-class="bg-gray-900 text-white px-3 py-2 rounded-md text-sm font-medium"
                  class="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
                >
                  {{ entry.label }} <ExclamationMark v-if="entry.exclamationMark" />
                </router-link>
              </div>
            </div>
          </div>
          <div
            class="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0"
          >
            <AlgoSignerButton />
            <PairPicker />
          </div>
        </div>
      </div>

      <!--
      Mobile menu, toggle classes based on menu state.

      Menu open: "block", Menu closed: "hidden"
      -->
      <div :class="menuClass">
        <div class="px-2 pt-2 pb-3 space-y-1">
          <router-link
            v-for="entry in entries"
            :key="entry.to"
            :to="entry.to"
            :exact="entry.exact"
            active-class="bg-gray-900 text-white block px-3 py-2 rounded-md text-base font-medium"
            class="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
          >
            {{ entry.label }} <ExclamationMark v-if="entry.exclamationMark" />
          </router-link>
        </div>
      </div>
    </nav>
  </div>
</template>
<script>
import { mapGetters } from 'vuex';
import AlgoSignerButton from './AlgoSignerButton.vue';
import ExclamationMark from './ExclamationMark';
import PairPicker from './PairPicker';

export default {
  name: 'Navbar',
  components: {
    AlgoSignerButton,
    // eslint-disable-next-line vue/no-unused-components
    ExclamationMark,
    PairPicker
  },
  data() {
    return {
      menuIsOpened: false
    };
  },
  computed: {
    ...mapGetters({
      userState: 'algorand/userState'
    }),
    menuClass() {
      if (this.menuIsOpened) {
        return 'block lg:hidden';
      } else {
        return 'hidden lg:hidden';
      }
    },
    entries() {
      return [
        {
          label: 'Swap',
          to: '/',
          exact: true
        },
        {
          label: 'Add Liquidity',
          to: '/add-liquidity',
        },
        {
          label: 'Remove Liquidity',
          to: '/remove-liquidity',
        },
        {
          label: 'Withdraw',
          to: '/withdraw',
          exclamationMark: this.userState['USR_A'] || this.userState['USR_B']
        },
      ];
    }
  },
  methods: {
    toggleMenu() {
      this.menuIsOpened = !this.menuIsOpened;
    },
  },
};
</script>
