const WebSocket = require("ws");

/*
const STREAM_URL="wss://testnet.binance.vision/ws";
const API_URL="https://testnet.binance.vision/api";
const API_KEY = "Sua key";
const SECRET_KEY = "Sua key";
const SYMBOL="BTCUSDT";
*/
const SHORT_PERIOD = 20; // Período para a média móvel curta
const LONG_PERIOD = 200; // Período para a média móvel longa

const saldoInicial = 10000;
let saldoAtual = 10000;
let isBuySignal = false;

const PROFITABILITY = parseFloat(process.env.PROFITABILITY);

// Array para armazenar os preços históricos
const historicalPrices = [];

// Criando Websocket para capturar dados de preço
const ws = new WebSocket(`${process.env.STREAM_URL}/${process.env.SYMBOL.toLowerCase()}@ticker`);

ws.onmessage = async (event) => {
    console.clear();
    const obj = JSON.parse(event.data);
    console.log("Symbol: " + obj.s);
    console.log("Preço Atual do BTC: " + obj.a);

    // Salvando os novos dados de preço no array de histórico
    historicalPrices.push(parseFloat(obj.a));

    // Limitando o tamanho do array de histórico para o número máximo de períodos
    if (historicalPrices.length > LONG_PERIOD) {
        historicalPrices.shift(); // Remove o primeiro elemento do array (o mais antigo)
    }

    // Verifica se há dados suficientes para calcular as médias móveis
    if (historicalPrices.length >= LONG_PERIOD) {
        // Calculando as médias móveis
        const shortSMA = calculateSMA(historicalPrices, SHORT_PERIOD);
        const longSMA = calculateSMA(historicalPrices, LONG_PERIOD);
        checkSignals(shortSMA, longSMA);
    
        if (isBuySignal === true){
            console.log("\n\nValor do BTC na hora da compra: " + obj.c);
            let invest = obj.c*0.01;
            console.log("Saldo atual: " + (saldoInicial - invest));
            saldoAtual = saldoInicial - invest;
        }else if (isBuySignal === false) {
            console.log("\n\nValor do BTC na hora da venda: " + obj.c);
            let invest = obj.c*0.01;
            console.log("Valor total da venda: " + invest);
            saldoAtual += + ((obj.c*0.01));
            console.log("Lucro até o momento: " + (saldoAtual - saldoInicial));

            console.log("Saldo atual: " + saldoAtual);
        }else{
            return;
        }
    } else {
        console.log("Aguardando dados suficientes para calcular as médias móveis...");
        console.log("Lucro até o momento é: " + (saldoAtual - saldoInicial));
    }

};

// Função para calcular a média móvel
function calculateSMA(prices, period) {
    if (prices.length < period) {
        return null; // Se não houver dados suficientes para calcular a média móvel, retorne null
    }

    const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
    const sma = sum / period;
    return sma;
}

// Função para verificar o sinal de compra/venda com base no cruzamento das médias móveis
function checkSignals(shortSMA, longSMA) {
    if (shortSMA === null || longSMA === null) {
        // Se uma das médias móveis não pôde ser calculada, não tome nenhuma ação
        return;
    }

    if (shortSMA > longSMA) {
        isBuySignal = true;
        console.log("Sinal de compra detectado");
    } else {
        isBuySignal = false;
        console.log("Sinal de venda detectado");
    }

    return isBuySignal;
}




const axios = require('axios');
const crypto = require('crypto');
const { URLSearchParams } = require("url");

// Função de efetuação das ordens de compra e venda por meio API da binance

async function newOrder(quantity, side){
    
    const data = {
        symbol: process.env.SYMBOL,
        type: 'MARKET',
        side,
        quantity
    };

    const timestamp = Date.now();
    const recvWindow = 5000;


    const signature = crypto
        .createHmac('sha256', process.env.SECRET_KEY)
        .update(`${new URLSearchParams({...data, timestamp, recvWindow})}`)
        .digest('hex');

    const newData = { ...data, timestamp, recvWindow, signature};
    const qs = `?${new URLSearchParams(newData)}`;

    try{
        const result = await axios({
            method: 'POST',
            url: `${process.env.API_URL}/v3/order${qs}`,
            headers: { 'X-MBX-APIKEY': process.env.API_KEY }
        })
        console.log(result.data);
    }
    catch(err){
        console.error(err)
    }

}
