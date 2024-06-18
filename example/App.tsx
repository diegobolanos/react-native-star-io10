import React from 'react';
import {
    ScrollView,
    View,
    Button,
    Text,
    PermissionsAndroid,
    Platform,
    Image,
    StyleSheet,
    TextInput,
    Modal,
    TouchableOpacity
} from 'react-native';

import {
    InterfaceType,
    StarConnectionSettings,
    StarXpandCommand,
    StarPrinter,
    StarDeviceDiscoveryManager,
    StarDeviceDiscoveryManagerFactory,
} from 'react-native-star-io10';

import Spinner from 'react-native-loading-spinner-overlay';
import { Colors } from 'react-native/Libraries/NewAppScreen';

// $ yarn add react-native-barcode-creator

//import BarcodeCreatorViewManager, { BarcodeFormat } from 'react-native-barcode-creator';

interface AppProps {
}

interface AppState {
    spinner: boolean,
    showWinner: boolean,
    spinnerText: string,
    printers: Array<StarPrinter>;
    dataTickets: Array<Array<number>>;
    addingTicket: boolean;
    currentTicket: Array<number>
}

const staticImage = require("./src/assets/liberty_lottery_logo.png");

const styles = StyleSheet.create({
    container: {
      marginTop: 20,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      height: '100%',
      textAlign: 'center',
    },
    barcode: {
        width: 140,
        height: 50,
        margin: 0,
        padding: 0,
        borderWidth: 0
    },
    qrcode: {
        width: 250,
        height: 250,
        margin: 0,
        padding: 0,
        borderWidth: 0
    },
    spinnerTextStyle: {
        color: 'white'

    }
  });

class App extends React.Component<AppProps, AppState> {

    private _manager?: StarDeviceDiscoveryManager;

    private winnerTicket = [5, 3, 9, 7, 9]
    
    private initialTickets = [
        //[4, 2, 8, 6, 8],
        //[3, 1, 7, 5, 7],
        //[2, 9, 6, 4, 6],
        //[1, 8, 5, 3, 5],
      ];

    private _onPressPrintButton = async() => {

        // lets detect the printer
        this.setState({
            printers: [],
            spinner: true,
            spinnerText: "Looking for Printer"
        });

        try {
            await this._manager?.stopDiscovery()
            var interfaceTypes: Array<InterfaceType> = [InterfaceType.Lan]

            this._manager = await StarDeviceDiscoveryManagerFactory.create(interfaceTypes);
            this._manager.discoveryTime = 10000;
            let printers:StarPrinter[] = []

            this._manager.onPrinterFound = (printer: StarPrinter) => {
                printers = this.state.printers;
                printers.push(printer);
                this.setState({
                    printers: printers,
                    spinnerText: "Printer Found"
                });

                console.log(`Found printer: ${printer.connectionSettings.identifier}.`);

                this._printTicket();
            };
            
            this._manager.onDiscoveryFinished = () => {
                if (printers.length <= 0) {
                    this.setState({
                        spinner: false,
                        spinnerText: ""
                    });
                }
                console.log(`Discovery finished.`);
            };

            console.log(`Lets try to find a printer`)
            await this._manager.startDiscovery();
        }
        catch(error) {
            this.setState({
                spinner: false,
                spinnerText: ""
            });
            console.log(`Error: ${String(error)}`);
        }
    }

    private _onPressAddButton = async() => {
        this.setState({
            addingTicket: true
        });
    }

    private _onAddOneTicket = async() => {
        let copy = this.state.dataTickets
        copy.push(this.state.currentTicket)
        this.setState({
            addingTicket: false,
            currentTicket: [0,0,0,0,0],
            dataTickets: copy
        });
    }

    private _onChangedNumberTicket(value:string, index:number) {
        let parsedVal = Number.parseInt(value)
        if (Number.isNaN(parsedVal)) {
            parsedVal = 0
        } else if (parsedVal > 9) {
            parsedVal = 9
        }

        let copy = this.state.currentTicket
        copy[index] = parsedVal
        this.setState({
            currentTicket: copy
        })
    }

    private _onWinnerTicket = async() => {
        let copy = this.state.dataTickets
        copy.push([5, 3, 9, 7, 9],)
        this.setState({
            dataTickets: copy
        });
    }

    private _onPressClearButton = async() => {
        this.setState({
            dataTickets: []
        });
    }

    private _onPrizeAwarded= async() => {
        this.setState({showWinner: true })
    }

    private _printTicket = async() => {

        // lets detect the printer
        this.setState({
            spinner: true,
            spinnerText: "Printing Ticket"
        });

        // var settings = new StarConnectionSettings();
        // settings.interfaceType = InterfaceType.Lan;
        // settings.identifier = this.state.printers[0].connectionSettings.identifier;
        // settings.autoSwitchInterface = false;

        // If you are using Android 12 and targetSdkVersion is 31 or later,
        // you have to request Bluetooth permission (Nearby devices permission) to use the Bluetooth printer.
        // https://developer.android.com/about/versions/12/features/bluetooth-permissions
        if (Platform.OS == 'android' && 31 <= Platform.Version) {
            if (this.state.printers[0].connectionSettings.interfaceType == InterfaceType.Bluetooth) {
                var hasPermission = await this._confirmBluetoothPermission();

                if (!hasPermission) {
                    console.log(`PERMISSION ERROR: You have to allow Nearby devices to use the Bluetooth printer`);
                    return;
                }
            }
        }

        console.log(`trying to connect to printer identifier=${this.state.printers[0].connectionSettings.identifier}, interfaceType=${this.state.printers[0].connectionSettings.interfaceType.toString()}, autoSwitchInterface=${this.state.printers[0].connectionSettings.autoSwitchInterface} `)
        var printer = new StarPrinter(this.state.printers[0].connectionSettings);

        try {
            // TSP100III series and TSP100IIU+ do not support actionPrintText because these products are graphics-only printers.
            // Please use the actionPrintImage method to create printing data for these products.
            // For other available methods, please also refer to "Supported Model" of each method.
            // https://www.star-m.jp/products/s_print/sdk/react-native-star-io10/manual/en/api-reference/star-xpand-command/printer-builder/action-print-image.html
            var builder = new StarXpandCommand.StarXpandCommandBuilder();
            builder.addDocument(new StarXpandCommand.DocumentBuilder()
            // To open a cash drawer, comment out the following code.
//          .addDrawer(new StarXpandCommand.DrawerBuilder()
//              .actionOpen(new StarXpandCommand.Drawer.OpenParameter())
//          )
            .addPrinter(new StarXpandCommand.PrinterBuilder()
                .styleAlignment(StarXpandCommand.Printer.Alignment.Center)
                .actionPrintImage(new StarXpandCommand.Printer.ImageParameter("liberty_lottery_logo_bw.png", 200))
                .styleInternationalCharacter(StarXpandCommand.Printer.InternationalCharacterType.Usa)
                .styleCharacterSpace(0)
                .styleAlignment(StarXpandCommand.Printer.Alignment.Center)
                .actionPrintText("Cadena Alexander Sta Cruz\n" +
                                "Agent 199\n" +
                                "Serial # 1218-7955-1416-7203\n" +
                                "Wed May 10 18:19:09 2023\n" +
                                "\n")
                .actionPrintText("Draw 2387 on 10 May 23 to Draw 2387\n" +
                                "Valid for 1 Draw\n\n")
                .add(new StarXpandCommand.PrinterBuilder()
                    .styleMagnification(new StarXpandCommand.MagnificationParameter(2, 2))
                    .styleBold(true)
                    .actionPrintText(
                        this.state.dataTickets.map((row, rowIndex) => {
                            return row.join(' ') + '\n'
                        }).join('')
                    )
                )
                .actionPrintBarcode(new StarXpandCommand.Printer.BarcodeParameter('mhvXdrZT4jP5T8vBxuvm75',
                //.actionPrintBarcode(new StarXpandCommand.Printer.BarcodeParameter('a0eebc99-9c0b-4ef8',
                                    StarXpandCommand.Printer.BarcodeSymbology.Code128)
                                    .setBarDots(1)
                                    .setHeight(5)
                                    .setPrintHri(true))
                .actionFeedLine(1)
                .actionPrintQRCode(new StarXpandCommand.Printer.QRCodeParameter('"http://perlaDelCaribe.com/more-information-and-paramete"')
                                    .setModel(StarXpandCommand.Printer.QRCodeModel.Model2)
                                    .setLevel(StarXpandCommand.Printer.QRCodeLevel.L)
                                    .setCellSize(8))
                .actionFeedLine(2)
                .actionCut(StarXpandCommand.Printer.CutType.Partial)
                )
            );

            var commands = await builder.getCommands();

            await printer.open();
            await printer.print(commands);

            console.log(`Success`);
        }
        catch(error) {
            console.log(`Error: ${String(error)}`);
        }
        finally {
            this.setState({
                spinner: false,
                spinnerText: ""
            });
            await printer.close();
            await printer.dispose();
        }
    }

    private _onPrizePrint = async() => {
        // lets detect the printer
        this.setState({
            spinner: true,
            spinnerText: "Printing Ticket"
        });

        // var settings = new StarConnectionSettings();
        // settings.interfaceType = InterfaceType.Lan;
        // settings.identifier = this.state.printers[0].connectionSettings.identifier;
        // settings.autoSwitchInterface = false;

        // If you are using Android 12 and targetSdkVersion is 31 or later,
        // you have to request Bluetooth permission (Nearby devices permission) to use the Bluetooth printer.
        // https://developer.android.com/about/versions/12/features/bluetooth-permissions
        if (Platform.OS == 'android' && 31 <= Platform.Version) {
            if (this.state.printers[0].connectionSettings.interfaceType == InterfaceType.Bluetooth) {
                var hasPermission = await this._confirmBluetoothPermission();

                if (!hasPermission) {
                    console.log(`PERMISSION ERROR: You have to allow Nearby devices to use the Bluetooth printer`);
                    return;
                }
            }
        }

        console.log(`trying to connect to printer identifier=${this.state.printers[0].connectionSettings.identifier}, interfaceType=${this.state.printers[0].connectionSettings.interfaceType.toString()}, autoSwitchInterface=${this.state.printers[0].connectionSettings.autoSwitchInterface} `)
        var printer = new StarPrinter(this.state.printers[0].connectionSettings);


        try {
            var builder = new StarXpandCommand.StarXpandCommandBuilder();
            builder.addDocument(new StarXpandCommand.DocumentBuilder()
            .addPrinter(new StarXpandCommand.PrinterBuilder()
                .styleAlignment(StarXpandCommand.Printer.Alignment.Center)
                .actionPrintImage(new StarXpandCommand.Printer.ImageParameter("liberty_lottery_logo_bw.png", 200))
                .styleInternationalCharacter(StarXpandCommand.Printer.InternationalCharacterType.Usa)
                .styleCharacterSpace(0)
                .styleAlignment(StarXpandCommand.Printer.Alignment.Center)
                .actionPrintText("Cadena Alexander Sta Cruz\n" +
                                "Agente 199\n" +
                                "Serial # 1218-7955-1416-7203\n" +
                                "Wed May 10 18:19:09 2023\n" +
                                "\n")
                .add(new StarXpandCommand.PrinterBuilder()
                    .styleMagnification(new StarXpandCommand.MagnificationParameter(2, 2))
                    .styleBold(true)
                    .actionPrintText('5 3 9 7 9\n')
                )
                .actionFeedLine(1)
                .actionPrintRuledLine(new StarXpandCommand.Printer.RuledLineParameter(100).setThickness(2))
                .add(new StarXpandCommand.PrinterBuilder()
                    .styleBold(true)
                    .actionPrintText("!!! Eres el feliz ganador del premio !!!\n")
                )
                .actionFeedLine(1)
                .add(new StarXpandCommand.PrinterBuilder()
                    .styleMagnification(new StarXpandCommand.MagnificationParameter(2, 2))
                    .styleBold(true)
                    .actionPrintText("$3.000.000\n")
                )
                .styleAlignment(StarXpandCommand.Printer.Alignment.Left)
                .actionPrintText("Sigue las siguientes instrucciones para reclamar tu premio:\n")
                .actionPrintText(" * Acude a las oficinas officiales de Liberty Lottery\n")
                .actionPrintText(" * Trae impreso este tickete\n")
                .actionPrintText(" * Trae tu identificacion oficial en buen estado\n")
                .styleAlignment(StarXpandCommand.Printer.Alignment.Center)
                .actionPrintRuledLine(new StarXpandCommand.Printer.RuledLineParameter(100).setThickness(2))
                .actionFeedLine(1)


                .actionPrintBarcode(new StarXpandCommand.Printer.BarcodeParameter('mhvXdrZT4jP5T8vBxuvm75',
                                    StarXpandCommand.Printer.BarcodeSymbology.Code128)
                                    .setBarDots(1)
                                    .setHeight(5)
                                    .setPrintHri(true))
                .actionFeedLine(1)
                .actionPrintQRCode(new StarXpandCommand.Printer.QRCodeParameter('"http://perlaDelCaribe.com/more-information-and-paramete"')
                                    .setModel(StarXpandCommand.Printer.QRCodeModel.Model2)
                                    .setLevel(StarXpandCommand.Printer.QRCodeLevel.L)
                                    .setCellSize(8))
                .actionFeedLine(2)
                .actionCut(StarXpandCommand.Printer.CutType.Partial)
                )
            );

            var commands = await builder.getCommands();

            await printer.open();
            await printer.print(commands);

            console.log(`Success`);
        }
        catch(error) {
            console.log(`Error: ${String(error)}`);
        }
        finally {
            this.setState({
                showWinner: false,
                spinner: false,
                spinnerText: ""
            });
            await printer.close();
            await printer.dispose();
        }
    }

    private async _confirmBluetoothPermission(): Promise<boolean> {
        var hasPermission = false;


        try {
            hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
    
            if (!hasPermission) {
                const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
                    
                hasPermission = status == PermissionsAndroid.RESULTS.GRANTED;
            }
        }
        catch (err) {
            console.warn(err);
        }

        return hasPermission;
    }

    constructor(props: any) {
        super(props);

        this.state = {
            spinner: false,
            showWinner: false,
            spinnerText: "",
            printers: [],
            dataTickets: this.initialTickets,
            addingTicket: false,
            currentTicket: [0,0,0,0,0]
        };
    }

    render() {
        return (
            <ScrollView>
            <View style={styles.container}>
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={this.state.showWinner}
                    onRequestClose={() => {this.setState( {showWinner:false})}}>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 22 }}>
                        <View style={{margin: 20, backgroundColor: '#DDD', borderRadius: 20, padding: 15, alignItems: 'center', 
                        shadowColor: '#000', shadowOffset: { width: 0, height: 2, }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,}}>
                            <View style={{ width: 300, marginTop: 20, alignItems: 'center'  }}>

                                <Text style={{fontWeight: 'bold', fontSize: 24}}>!!! Muchs Felicidades !!!</Text>
                                <Text style={{fontWeight: 'bold', fontSize: 20}}>!!! Has Ganado !!!</Text>

                                <View style={{height: 20}}/>

                                <Text>Con tu tiquete: </Text>
                                <Text style={{fontWeight: 'bold', fontSize: 24}}>5 3 9 7 9</Text>
                                <Text>Te has convertido en el ganador del premio:</Text>

                                <View style={{height: 10}}/>
                                <Text style={{fontWeight: 'bold', fontSize: 24}}>$3.000.000</Text>
                                <View style={{height: 10}}/>

                                <Text style={{fontWeight: 'bold'}}>Has click en Imprimir para seguir las instrucciones de reclamar tu premio</Text>

                                <View style={{height: 20}}/>

                                <Button
                                    title="Imprimir"
                                    onPress={this._onPrizePrint}
                                />
                            </View>
                        </View>
                    </View>
                </Modal>
                <Spinner
                    visible={this.state.spinner}
                    textContent={this.state.spinnerText}
                    textStyle={styles.spinnerTextStyle}
                    overlayColor="rgba(0, 0, 0, 0.8)"
                    animation="fade"/>
                <Image style={{
                    resizeMode: 'stretch',
                    height: 200,
                    }}
                    source={staticImage}/>
                
                <View style={{height: 20}}/>

                <Text>Cadena Alexander Sta Cruz</Text>
                <Text>Agent 199</Text>
                <Text>Serial # 1218-7955-1416-7203</Text>
                <Text>Wed May 10 18:19:09 2023</Text>

                <View style={{height: 20}}/>

                <Text style={{fontWeight: 'bold', fontSize: 16}}>Draw 2387 on 10 May 23 to Draw 2387</Text>
                <Text>Valid for 1 Draw</Text>

                <View style={{height: 20}}/>

                {this.state.addingTicket && (
                    <View style={{ flex:1, display: 'flex', flexDirection: 'row', backgroundColor: 'lightblue', padding: 1}}>
                        <TextInput 
                            style={{fontWeight: 'bold', fontSize: 26, letterSpacing: 1}}
                            keyboardType = 'number-pad'
                            onChangeText = {(text)=> this._onChangedNumberTicket(text, 0)}
                            value = {this.state.currentTicket[0].toString()} />
                        <TextInput 
                            style={{fontWeight: 'bold', fontSize: 26, letterSpacing: 1}}
                            keyboardType = 'number-pad'
                            onChangeText = {(text)=> this._onChangedNumberTicket(text, 1)}
                            value = {this.state.currentTicket[1].toString()} />
                        <TextInput 
                            style={{fontWeight: 'bold', fontSize: 26, letterSpacing: 1}}
                            keyboardType = 'number-pad'
                            onChangeText = {(text)=> this._onChangedNumberTicket(text, 2)}
                            value = {this.state.currentTicket[2].toString()} />
                        <TextInput 
                            style={{fontWeight: 'bold', fontSize: 26, letterSpacing: 1}}
                            keyboardType = 'number-pad'
                            onChangeText = {(text)=> this._onChangedNumberTicket(text, 3)}
                            value = {this.state.currentTicket[3].toString()} />
                        <TextInput 
                            style={{fontWeight: 'bold', fontSize: 26, letterSpacing: 1}}
                            keyboardType = 'number-pad'
                            onChangeText = {(text)=> this._onChangedNumberTicket(text, 4)}
                            value = {this.state.currentTicket[4].toString()} />
                        <Button
                            style={{display: 'flex', justifyContent: 'center'}}
                            title="+"
                            onPress={this._onAddOneTicket}>
                                <Text style={{flex: 1, textAlign: 'center', textAlignVertical: 'bottom'}}>+</Text>
                        </Button>
                    </View>
                )}

                <Text style={{fontWeight: 'bold', fontSize: 26, letterSpacing: 1}}>
                    {
                        this.state.dataTickets.map((row, rowIndex) => {
                            return row.join(' ') + '\n'
                        })
                    }
                </Text>

                <View style={{height: 10}}/>

                <View style={{ flexDirection: 'row', width: 150, marginTop: 20, justifyContent: 'space-between' }}>
                    <TouchableOpacity
                        disabled={this.state.addingTicket}
                        onPress={this._onPressClearButton}
                        style={[{flex: 2, padding: 10, backgroundColor: 'lightblue', borderRadius: 5, marginHorizontal: 5, alignItems: 'center'}, 
                        this.state.addingTicket && {backgroundColor: 'lightgrey'}]}>
                        <Text>Clear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        disabled={this.state.addingTicket}
                        onPress={this._onPressAddButton}
                        style={[{flex: 2, padding: 10, backgroundColor: 'lightblue', borderRadius: 5, marginHorizontal: 5, alignItems: 'center'}, 
                        this.state.addingTicket && {backgroundColor: 'lightgrey'}]}>
                        <Text>Add</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', width: 150, marginTop: 20, justifyContent: 'space-between' }}>
                    <TouchableOpacity
                        disabled={this.state.addingTicket}
                        onPress={this._onPressPrintButton}
                        style={[{flex: 2, padding: 10, backgroundColor: 'lightblue', borderRadius: 5, marginHorizontal: 5, alignItems: 'center'}, 
                        this.state.addingTicket && {backgroundColor: 'lightgrey'}]}>
                        <Text>Print</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        disabled={this.state.addingTicket}
                        onPress={this._onWinnerTicket}
                        style={[{flex: 2, padding: 10, backgroundColor: 'lightblue', borderRadius: 5, marginHorizontal: 5, alignItems: 'center'}, 
                        this.state.addingTicket && {backgroundColor: 'lightgrey'}]}>
                        <Text>Winner</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', width: 150, marginTop: 20, justifyContent: 'space-between' }}>
                    <TouchableOpacity
                        disabled={this.state.addingTicket}
                        onPress={this._onPrizeAwarded}
                        style={[{flex: 2, padding: 10, backgroundColor: 'lightblue', borderRadius: 5, marginHorizontal: 5, alignItems: 'center'}, 
                        this.state.addingTicket && {backgroundColor: 'lightgrey'}]}>
                        <Text>Prize</Text>
                    </TouchableOpacity>
                </View>

                <View style={{height: 30}}/>
            </View>
            </ScrollView>
        );
    }
};

export default App;