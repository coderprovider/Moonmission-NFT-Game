
import './App.css';
import { React , useEffect, useState} from 'react';
import Game from './contracts/Game.json';
import Staking from './contracts/Staking.json';
import Metadata from './contracts/Game.json';
import WSDM from './contracts/WSDM.json';
import { useMoralis } from "react-moralis";




const App = () => {
  const { web3, authenticate, logout, isAuthenticated, user } = useMoralis();

  const [totalNFTs, setTotalNFTs]= useState(0);
  const [rewards, setRewards]= useState(0);
  const [wsdmBalance, setWsdmBalance]= useState(0);
  const [stakedWsdm, setStakedWsdm]= useState(0);
  const [totalStaked, setTotalStaked]= useState(0);

  const wsdmContractAddress = "0x623D9bdA6c7Ef60AbB3F66f2c88EBcc0bfDcADcE";
  const abiWSDM = WSDM.abi;

  const stakingContractAddress = "0x37a5F92b9CC4f75cf65b04A763A6e450e6FC92F9";
  const abiStaking = Staking.abi;

  const gameContractAddress = "0x32c77Dfd751894256a79044bAAcf1F34098f7616";
  const abiGame = Game.abi;

  const metadataContractAddress = "0x219199f256bAf87924605A08d94DCE65CaE066ac";
  const abiMetadata = Metadata.abi;

  const wsdmContract = new web3.eth.Contract(abiWSDM, wsdmContractAddress);
  const gameContract = new web3.eth.Contract(abiGame, gameContractAddress);
  const stakingContract = new web3.eth.Contract(abiStaking, stakingContractAddress);
  const metadataContract = new web3.eth.Contract(abiMetadata, metadataContractAddress);
  wsdmContract.setProvider(window.web3.currentProvider);
  gameContract.setProvider(window.web3.currentProvider);
  stakingContract.setProvider(window.web3.currentProvider);
  metadataContract.setProvider(window.web3.currentProvider);

  useEffect( ()=>{
    const fetchData = async ()=>{
      if(isAuthenticated){
        const totalSupply = await gameContract.methods.totalSupply().call({from:user.get('ethAddress')})
        setTotalNFTs(totalSupply)
        const bearRewardsOf = await gameContract.methods.bearRewardsOf(user.get('ethAddress')).call({from:user.get('ethAddress')})
        const bullRewardsOf = await gameContract.methods.bullRewardsOf(user.get('ethAddress')).call({from:user.get('ethAddress')})
        let rewards = (parseInt(bearRewardsOf)+parseInt(bullRewardsOf))
        rewards = rewards/1000000000000000000
        setRewards(rewards)
    
        const balanceOf = await wsdmContract.methods.balanceOf(user.get('ethAddress')).call({from:user.get('ethAddress')})
        setWsdmBalance((balanceOf/1000000000000000000))
    
        const staked = await stakingContract.methods.depositedOf(user.get('ethAddress')).call({from:user.get('ethAddress')})
        setStakedWsdm(staked)
    
        const totalstaked = await stakingContract.methods.totalDeposited().call({from:user.get('ethAddress')})
        setTotalStaked(totalstaked)
      }
    }
    
    fetchData()

  })

  const mintWithEth = async (event) => {
    event.preventDefault();
    if (1 <= event.target.tokens.value && event.target.tokens.value < 11) {
      if (event.target.tokens.value == 1) {
        const receipt = await gameContract.methods.mintWithETH().send({ from: user.get("ethAddress"), value: (event.target.tokens.value * web3.utils.toWei('0.05', 'ether')) })
        console.log(receipt)
      }
      if (event.target.tokens.value > 1) {
        console.log(event.target.tokens.value)
        const receipt = await gameContract.methods.mintManyWithETH(event.target.tokens.value).send({ from: user.get("ethAddress"), value: (event.target.tokens.value * web3.utils.toWei('0.05', 'ether')) })
        console.log(receipt)
      }

    }
  }

  const mintWithWSDM = async (event) => {
    event.preventDefault();
    const balanceOf = await wsdmContract.methods.balanceOf(user.get("ethAddress")).call({ from: user.get("ethAddress") })
    if (balanceOf > event.target.tokens.value * 40000 && event.target.tokens.value < 11 && 1 <= event.target.tokens.value) {
      if (event.target.tokens.value == 1) {
        const receipt = await gameContract.methods.mint().send({ from: user.get("ethAddress") })
        console.log(receipt)
      }
      if (event.target.tokens.value > 1) {
        console.log(event.target.tokens.value)
        const receipt = await gameContract.methods.mintMany(event.target.tokens.value).send({ from: user.get("ethAddress") })
        console.log(receipt)
      }

    }
 


  }

  const claim = async () => {
    if(rewards>0){
    const receipt = await gameContract.methods.claim().send({ from: user.get("ethAddress") })
    console.log(receipt)
  }
  }

  const stake = async (event) => {
    event.preventDefault();
    const receipt = await stakingContract.methods.deposit(event.target.stakingAmount.value).send({ from: user.get("ethAddress") })
    console.log(receipt)
  }
  const unstake = async (event) => {
    event.preventDefault();
    const receipt = await stakingContract.methods.withdraw(event.target.unstakingAmount.value).send({ from: user.get("ethAddress") })
    console.log(receipt)
  }
  const unstakeAll = async (event) => {
    event.preventDefault();
    const receipt = await stakingContract.methods.withdrawAll(event.target.unstakingAmount.value).send({ from: user.get("ethAddress") })
    console.log(receipt)
  }


  if (!isAuthenticated) {
    return (
      <div className=" mt-5 row">
        <div className="col-md-8 offset-md-2">
          <button className="btn btn-primary btn-lg" onClick={() => authenticate()}>Connect Wallet</button>
        </div>
      </div>
    );
  }

  return (

    <div className=" m-4 row">
      <div className="col-md-8 offset-md-2" >
        <button className="btn btn-primary btn-lg" onClick={() => logout()}>Logout</button>
        <h1>Welcome {user.get("ethAddress")}</h1>

        <div className="card m-4">
          <div className="card-body">
        <h1>The total Minted tokens:  {totalNFTs}/50000</h1>
        </div>
        </div>

        <div className="card m-4">
          <div className="card-body">
            <form onSubmit={mintWithEth}>
              <div className="form-group" style={{ width: "50%" }}>
                <label htmlFor="exampleInputEmail1">Mint with ETH</label>
                <h5>0.05 ETH / NFT</h5>
                <input name="tokens" type="number" min="1" max="10" className="form-control mb-2" placeholder="Number of tokens" />
              </div>

              <button type="submit" className="btn btn-primary">Mint</button>
            </form>
          </div>
        </div>

        <div className="card m-4">
          <div className="card-body">


            <form onSubmit={mintWithWSDM}>
              <div className="form-group" style={{ width: "50%" }}>
                <label htmlFor="exampleInputEmail1">Mint with WSDM</label>
                <h5>40,000 WSDM / NFT</h5>
                <input name="tokens" type="number" min="1" max="10" className="form-control mb-2" placeholder="Number of tokens" />
              </div>

              <button type="submit" className="btn btn-primary">Mint</button>
            </form>

          </div>
        </div>

        <div className="card m-4">
          <div className="card-body">

            <h4>Your total pending rewards are: {rewards}</h4>
            <button onClick={claim} disabled={rewards<=0} className="btn btn-primary">Claim Rewards</button>
            

          </div>
        </div>

        <div className="card m-4">
          <div className="card-body">

            <h3>Stake</h3>

            <h4>Total Staked WSDM: {totalStaked}</h4>
            <h5>Your Current WSDM Balance: {wsdmBalance}</h5>

            <h5>Your Staked WSDM Balance: {stakedWsdm}</h5>
        
            <form onSubmit={stake}>
              <div className="form-group" style={{ width: "50%" }}>
                <label htmlFor="exampleInputEmail1">Stake</label>
                <input name="stakingAmount" type="number" min="1"  className="form-control mb-2" placeholder="Amount" />
              </div>

              <button type="submit" disabled={!(wsdmBalance>0)} className="btn btn-primary btn-lg">Stake</button>
            </form>

            <form onSubmit={unstake}>
              <div className="form-group" style={{ width: "50%" }}>
                <label htmlFor="exampleInputEmail1">Unstake</label>
                <input name="unstakingAmount" type="number" min="1"  className="form-control mb-2" placeholder="Amount" />
              </div>

              <button type="submit" disabled={!(stakedWsdm>0)} className="btn btn-primary  btn-lg">Unstake</button>
              
            </form>
            <button onClick={unstakeAll}disabled={!(stakedWsdm>0)} className="btn btn-primary mt-3  btn-lg">Unstake ALL</button>
          </div>
        </div>
        <div className="card m-4">
          <div className="card-body">
              <a className="btn btn-primary btn-lg btn-block" href="https://testnets.opensea.io/collection/bulls-bears-game-zvvuv6locr"> Check On Opensea</a>
          </div>
        </div>




      </div>

    </div>

  );
}


export default App;
