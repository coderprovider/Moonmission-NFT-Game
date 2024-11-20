var WSDM = artifacts.require("./WSDM.sol");
var Metadata = artifacts.require("./Metadata.sol")
var Game = artifacts.require("./Game.sol");
var Staking = artifacts.require("./Staking.sol");


module.exports = async (deployer, network, accounts) => {
  console.log("Deploying wsdm...");
  await deployer.deploy(WSDM)
  const wsdm = await WSDM.deployed()
  console.log(wsdm.address)
   

  console.log("Deploying Metadata...");
  await deployer.deploy(Metadata,
    //This is the base artwork for the whale 
    "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgAgMAAAAOFJJnAAAADFBMVEUAAABdeZOMn7FEV2nyJg1DAAAAAXRSTlMAQObYZgAAAIRJREFUGNNjoALQWrUATDOtWrWKgcGeYRXX1NCoBgbTQ2FcoaFhQEZohGZoaOgCBt7QBBAjgYH5asNSMIPBjAHKuLZqKoRxNSsUygiFMo4iMRxDQw4wMBwMDWVgYAZaaSAawsDAA2JcjWFg4GcA4tACBub/QDWmoef///n/ASjynwK/AQCl7i8ji726+wAAAABJRU5ErkJggg==",
    //This is the base artwork for the fisherman
    "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgBAMAAACBVGfHAAAAIVBMVEUAAAD+wpDAn3D/pgSjQwaBNgf/zqbllADepnfYkVYaGhqOm44UAAAAAXRSTlMAQObYZgAAAIRJREFUKM9jIBukAUECEp9NEAjE8AkwCoIAkoAgTgGEFqmFUgsxzMAUQDNEAFmAESGAUILqGY4OVD6TUZMRioCSkZKRArICJWPjYiVkAXVzY2NkAc7pxsbmM5GdIWxcbozidCElJSUUAREXFxdUAddQFAEGltDQEAZUAVY0gQAGuADlAACE6xLVT0+zwAAAAABJRU5ErkJggg==",
    //This is the colors for the background
    ["F8DEE5","F4E1F4","E5F0E9","FAEFDB","F8DFDD","F9EEDD","D8EBFD"] 
  );
  const metadata = await Metadata.deployed()

  console.log("Deploying Game...")
  await deployer.deploy(
    Game,
    metadata.address,
    wsdm.address,
    //Yet to determine
    "0x84d39dee962800a31723bd828a91f84ac58fa4bb1619aa7006d7c3722154593a"

  );
  
  const game = await Game.deployed()

  console.log("Deploying Staking...");
  await deployer.deploy(
    Staking,
    game.address,
    //address for the UniswapV2Pair on Rinkeby
    "0x03E6c12eF405AC3F642B9184eDed8E1322de1a9e")

  const staking = await Staking.deployed()
 


  

};
