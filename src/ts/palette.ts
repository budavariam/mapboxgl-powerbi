module powerbi.extensibility.visual {
    import DataViewObjects = powerbi.extensibility.utils.dataview.DataViewObjects;
    import DataViewObject = powerbi.extensibility.utils.dataview.DataViewObject;

    interface GroupColor {
        name: string,
        color: string;
    }

    export class Palette {
        private mapVisual: MapboxMap;
        private groupColors: GroupColor[];
        private colorMap: { [group: string]: string };
        private host: IVisualHost;
        private colorPalette: IColorPalette;

        constructor(mapVisual: MapboxMap, host: IVisualHost) {
            this.mapVisual = mapVisual
            this.host = host
            this.colorPalette = host.colorPalette
            this.groupColors = []
            this.colorMap = {
            }
        }

        public getColor(id: string | number): string {
            if (!this.colorMap[id]) {
                this.colorMap[id] = this.colorPalette.getColor(id.toString()).value
            }

            return this.colorMap[id];
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions) {
            let objectEnumeration: VisualObjectInstance[] = [];
            for (let group of this.groupColors) {
                objectEnumeration.push({
                    objectName: options.objectName,
                    displayName: group.name,
                    properties: {
                        fill: {
                            solid: {
                                color: group.color
                            }
                        }
                    },
                    // Creates options under metadata.objects.dataColorsPalette.$instances
                    selector: {
                        id: group.name
                    }
                });
            }
            return objectEnumeration;
        }

        public update(dataView: DataView, features: any) {
            try {
                this.groupColors = [];
                const roleMap = this.mapVisual.getRoleMap()

                if (!roleMap.color) {
                    return;
                }

                if (mapboxUtils.shouldUseGradient(roleMap.color)) {
                    return;
                }

                let groups = {};
                features.map(feature => {
                    const name = feature.properties[roleMap.color.displayName];
                    if (!groups[name]) {
                        groups[name] = true;
                    }
                });
                this.groupColors = this.createGroupColors(groups, dataView);
            }
            catch (err) {
                console.log("Exception occured during group color creation: ", err);
            }
        }

        createGroupColors(groups, dataView: DataView) {
            const dataColorsPalette = dataView && dataView.metadata && dataView.metadata.objects ?
                DataViewObjects.getObject(dataView.metadata.objects, "dataColorsPalette")
                :
                null;

            return Object.keys(groups).map( (group, i) => {
                let colorValue = this.getColor(group)
                if (dataColorsPalette && dataColorsPalette.$instances) {
                    colorValue = DataViewObject.getFillColorByPropertyName(dataColorsPalette.$instances[group], "fill", colorValue);
                }

                this.colorMap[group] = colorValue

                return {
                    name: group,
                    color: colorValue,
                }
            })
        }
    }
}
