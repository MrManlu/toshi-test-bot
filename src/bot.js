const Bot = require('./lib/Bot')
const SOFA = require('sofa-js')
const Fiat = require('./lib/Fiat')
const Client = require('node-rest-client').Client
const Web3 = require('web3')

const priceURL = "https://api.coingecko.com/api/v3/coins/ethereum?localization=false"
var client = new Client()

let bot = new Bot()
var web3 = new Web3();

web3.setProvider(new web3.providers.HttpProvider('https://api.myetherapi.com/eth'))

// ROUTING

bot.onEvent = function(session, message) {
  switch (message.type) {
    case 'Init':
      welcome(session)
      break
    case 'Message':
      onMessage(session, message)
      break
    case 'Command':
      onCommand(session, message)
      break
    case 'Payment':
      onPayment(session, message)
      break
    case 'PaymentRequest':
      welcome(session)
      break
  }
}

function onMessage(session, message) {
  welcome(session)
}

function onCommand(session, command) {
  switch (command.content.value) {
    case 'ping':
      pong(session)
      break
    case 'price':
      ethprice(session)
      break
    case 'latest':
      ethblock(session)
      break
    case 'game':
      game(session)
      break
    case 'game:0':
      gameResp(session, '0');
      break;
    case 'game:1':
      gameResp(session, '1');
      break;
    case 'count':
      count(session)
      break
    case 'donate':
      donate(session)
      break
    }
}

function onPayment(session, message) {
  if (message.fromAddress == session.config.paymentAddress) {
    // handle payments sent by the bot
    if (message.status == 'confirmed') {
      // perform special action once the payment has been confirmed
      // on the network
      sendMessage(session, `Transaction confirmed! 💰`);

    } else if (message.status == 'error') {
      // oops, something went wrong with a payment we tried to send!
    }
  } else {
    // handle payments sent to the bot
    if (message.status == 'unconfirmed') {
      // payment has been sent to the ethereum network, but is not yet confirmed
      sendMessage(session, `Thanks for the payment! 🙏`);
      if (session.get('newGame'))
      {
        sendMessage(session, `Starting the game!`);
        onGame(session);
      }
    } else if (message.status == 'confirmed') {
      // handle when the payment is actually confirmed!
    } else if (message.status == 'error') {
      sendMessage(session, `There was an error with your payment!🚫`);
    }
  }
}

// STATES

function welcome(session) {
  sendMessage(session, `Hello Token!`)
  session.set('newGame', false);
}

function pong(session) {
  sendMessage(session, `Pong`)
}

function ethprice(session) {
  client.get(priceURL, function (data, response) {
    //console.log(data.market_data.current_price.eur);
    let lastPrice = data.market_data.current_price.eur.toFixed(2)
    let message = "Last price: " + lastPrice
    sendMessage(session, message)
  });
}

function ethblock(session) {
  web3.eth.getBlock("latest", function(error, result){
    if(!error)
    {
        //console.log(JSON.stringify(result));
        //console.log(result.number);
        var message = "Latest block: #" + result.number
        sendMessage(session, message)
    }
    else
        console.error(error);
  });
}

// example of how to store state on each user
function count(session) {
  let count = (session.get('count') || 0) + 1
  session.set('count', count)
  sendMessage(session, `${count}`)
}

function donate(session) {
  // request $1 USD at current exchange rates
  Fiat.fetch().then((toEth) => {
    session.requestEth(toEth.EUR(1))
  })
}

function game(session) {
  // request $1 USD at current exchange rates
  Fiat.fetch().then((toEth) => {
    session.requestEth(toEth.EUR(0.1))
  })
  session.set('newGame', true);
}

function onGame(session) {
  let controls = [
    {type: 'button', label: '0', value: 'game:0'},
    {type: 'button', label: '1', value: 'game:1'}
  ]
  sendMessageKbd(session, `Choose a binary number ;)`, controls);
  let res = Math.floor(Math.random() * 2);
  session.set('gameResult', res);
  console.log('Math result: ' + res);
}

function gameResp(session, userresp)
{
  if (session.get('newGame'))
  {
    if (userresp == session.get('gameResult'))
    {
      sendMessage(session, `🎉 Congrats! you win 🎉`);
      Fiat.fetch().then((toEth) => {
        session.sendEth(toEth.EUR(0.2))
      })
    } else {
      sendMessage(session, `💸 Oops, try again! 💸`);
    }
    session.set('newGame', false);
  }
}

// HELPERS

function sendMessage(session, message) {
  let controls = [
    {
      type: "group",
      label: "Examples",
      controls: [
        {type: 'button', label: 'Ping', value: 'ping'},
        {type: 'button', label: 'Count', value: 'count'},
        {type: 'button', label: 'Donate', value: 'donate'},
      ]
    },
    {
      type: "group",
      label: "ETH utils",
      controls: [
        {type: 'button', label: 'ETH Price', value: 'price'},
        {type: 'button', label: 'Last block', value: 'latest'},
      ]
    },
    {type: 'button', label: 'Game', value: 'game'}
  ]
  session.reply(SOFA.Message({
    body: message,
    controls: controls,
    showKeyboard: false,
  }))
}

function sendMessageKbd(session, message, controls) {
  session.reply(SOFA.Message({
    body: message,
    controls: controls,
    showKeyboard: false,
  }))
}
