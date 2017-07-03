/**
 * A component that displays a label tree. The labels can be searched and selected.
 *
 * @type {Object}
 */
biigle.$component('labelTrees.components.labelTree', {
    template: '<div class="label-tree">' +
        '<h4 class="label-tree__title" v-if="showTitle">' +
            '<button v-if="collapsible" @click.stop="collapse" class="btn btn-default btn-xs pull-right" :title="collapseTitle">' +
                '<span v-if="collapsed" class="glyphicon glyphicon-chevron-down" aria-hidden="true"></span>' +
                '<span v-else class="glyphicon glyphicon-chevron-up" aria-hidden="true"></span>' +
            '</button>' +
            '{{name}}' +
        '</h4>' +
        '<ul v-if="!collapsed" class="label-tree__list">' +
            '<label-tree-label :label="label" :deletable="deletable" :show-favourites="showFavourites" :flat="flat" v-for="label in rootLabels" @select="emitSelect" @deselect="emitDeselect" @delete="emitDelete" @add-favourite="emitAddFavourite" @remove-favourite="emitRemoveFavourite"></label-tree-label>' +
            '<li v-if="hasNoLabels" class="text-muted">No labels</li>' +
        '</ul>' +
    '</div>',
    data: function () {
        return {
            collapsed: false
        };
    },
    components: {
        labelTreeLabel: biigle.$require('labelTrees.components.labelTreeLabel'),
    },
    props: {
        name: {
            type: String,
            required: true,
        },
        labels: {
            type: Array,
            required: true,
        },
        showTitle: {
            type: Boolean,
            default: true,
        },
        // If false the label tree assumes it is used in a label-trees component.
        standalone: {
            type: Boolean,
            default: false,
        },
        collapsible: {
            type: Boolean,
            default: true,
        },
        // Indicated whether multiple labels can be selected at the same time.
        multiselect: {
            type: Boolean,
            default: false,
        },
        // Indicated whether labels can be deleted.
        deletable: {
            type: Boolean,
            default: false,
        },
        // Indicated whether labels can be selected as favourites.
        showFavourites: {
            type: Boolean,
            default: false,
        },
        // Indicates whether the labels should be displayed in a flat list instead of a tree.
        flat: {
            type: Boolean,
            default: false,
        },
    },
    computed: {
        labelMap: function () {
            var map = {};
            for (var i = this.labels.length - 1; i >= 0; i--) {
                map[this.labels[i].id] = this.labels[i];
            }

            return map;
        },
        compiledLabels: function () {
            var compiled = {null: []};
            var i;

            if (this.flat) {
                this.labels.forEach(function (label) {
                    compiled[null].push(label);
                });
            } else {
                // Create datastructure that maps label IDs to the child labels.
                this.labels.forEach(function (label) {
                    if (compiled.hasOwnProperty(label.parent_id)) {
                        compiled[label.parent_id].push(label);
                    } else {
                        compiled[label.parent_id] = [label];
                    }
                });

                // update the label children with the compiled datastructure
                this.labels.forEach(function (label) {
                    if (compiled.hasOwnProperty(label.id)) {
                        Vue.set(label, 'children', compiled[label.id]);
                    } else {
                        Vue.set(label, 'children', undefined);
                        // If the last child was deleted, close the label.
                        label.open = false;
                    }
                });
            }

            return compiled;
        },
        rootLabels: function () {
            return this.compiledLabels[null];
        },
        collapseTitle: function () {
            return this.collapsed ? 'Expand' : 'Collapse';
        },
        hasNoLabels: function () {
            return this.rootLabels.length === 0;
        },
    },
    methods: {
        hasLabel: function (id) {
            return this.labelMap.hasOwnProperty(id);
        },
        getLabel: function (id) {
            return this.labelMap[id];
        },
        getParents: function (label) {
            var parents = [];
            while (label.parent_id !== null) {
                label = this.getLabel(label.parent_id);
                parents.unshift(label.id);
            }

            return parents;
        },
        emitSelect: function (label) {
            this.$emit('select', label);
        },
        emitDeselect: function (label) {
            this.$emit('deselect', label);
        },
        emitDelete: function (label) {
            this.$emit('delete', label);
        },
        selectLabel: function (label) {
            if (!this.multiselect) {
                this.clearSelectedLabels();
            }

            // The selected label does not nessecarily belong to this label tree since
            // the tree may be displayed in a label-trees component with other trees.
            if (label && this.hasLabel(label.id)) {
                label.selected = true;
                this.collapsed = false;
                if (!this.flat) {
                    var parents = this.getParents(label);
                    for (var i = parents.length - 1; i >= 0; i--) {
                        this.getLabel(parents[i]).open = true;
                    }
                }
            }
        },
        deselectLabel: function (label) {
            if (this.hasLabel(label.id)) {
                label.selected = false;
            }
        },
        clearSelectedLabels: function () {
            this.labels.forEach(function (label) {
                label.selected = false;
            });
        },
        collapse: function () {
            this.collapsed = !this.collapsed;
        },
        emitAddFavourite: function (label) {
            this.$emit('add-favourite', label);
        },
        emitRemoveFavourite: function (label) {
            this.$emit('remove-favourite', label);
        },
        addFavouriteLabel: function (label) {
            if (this.hasLabel(label.id)) {
                label.favourite = true;
            }
        },
        removeFavouriteLabel: function (label) {
            if (this.hasLabel(label.id)) {
                label.favourite = false;
            }
        },
    },
    created: function () {
        // Set the reactive label properties
        this.labels.forEach(function (label) {
            if (!label.hasOwnProperty('open')) {
                Vue.set(label, 'open', false);
            }

            if (!label.hasOwnProperty('selected')) {
                Vue.set(label, 'selected', false);
            }

            if (!label.hasOwnProperty('favourite')) {
                Vue.set(label, 'favourite', false);
            }
        });

        // The label tree can be used in a label-trees component or as a single label
        // tree. In a label-trees component only one label can be selected in all label
        // trees so the parent handles the event. A single label tree handles the event
        // by itself.
        if (this.standalone) {
            this.$on('select', this.selectLabel);
            this.$on('deselect', this.deselectLabel);
        } else {
            this.$parent.$on('select', this.selectLabel);
            this.$parent.$on('deselect', this.deselectLabel);
            this.$parent.$on('clear', this.clearSelectedLabels);
            // Label favourites only work with the label-trees component.
            this.$parent.$on('add-favourite', this.addFavouriteLabel);
            this.$parent.$on('remove-favourite', this.removeFavouriteLabel);
        }
    }
});
