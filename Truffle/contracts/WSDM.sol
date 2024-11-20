// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;


import "./Game.sol";
import "./Staking.sol";


interface Callable {
	function tokenCallback(address _from, uint256 _tokens, bytes calldata _data) external returns (bool);
}

interface Receiver {
	function onERC721Received(address _operator, address _from, uint256 _tokenId, bytes calldata _data) external returns (bytes4);
}

interface Router {
	function WETH() external pure returns (address);
	function factory() external pure returns (address);
}

interface Factory {
	function getPair(address, address) external view returns (address);
	function createPair(address, address) external returns (address);
}

interface Pair {
	function token0() external view returns (address);
	function totalSupply() external view returns (uint256);
	function balanceOf(address) external view returns (uint256);
	function allowance(address, address) external view returns (uint256);
	function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
	function transfer(address, uint256) external returns (bool);
	function transferFrom(address, address, uint256) external returns (bool);
}

contract WSDM {

	uint256 constant private UINT_MAX = type(uint256).max;
	uint256 constant private TRANSFER_FEE = 1; // 1% per transfer

	string constant public name = "WSDM Token";
	string constant public symbol = "WSDM";
	uint8 constant public decimals = 18;

	struct User {
		uint256 balance;
		mapping(address => uint256) allowance;
	}

	struct Info {
		uint256 totalSupply;
		mapping(address => User) users;
		mapping(address => bool) toWhitelist;
		mapping(address => bool) fromWhitelist;
		address owner;
		Router router;
		Pair pair;
		bool weth0;
		Game g;
		Staking staking;
	}
	Info private info;


	event Transfer(address indexed from, address indexed to, uint256 tokens);
	event Approval(address indexed owner, address indexed spender, uint256 tokens);
	event WhitelistUpdated(address indexed user, bool fromWhitelisted, bool toWhitelisted);


	modifier _onlyOwner() {
		require(msg.sender == owner());
		_;
	}


	constructor() {
		info.router = Router(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);
		info.pair = Pair(Factory(info.router.factory()).createPair(info.router.WETH(), address(this)));
		info.weth0 = info.pair.token0() == info.router.WETH();
		info.owner = msg.sender;
	}

	function setOwner(address _owner) external _onlyOwner {
		info.owner = _owner;
	}

	function setWhitelisted(address _address, bool _fromWhitelisted, bool _toWhitelisted) external _onlyOwner {
		info.fromWhitelist[_address] = _fromWhitelisted;
		info.toWhitelist[_address] = _toWhitelisted;
		emit WhitelistUpdated(_address, _fromWhitelisted, _toWhitelisted);
	}

	function deploySetGame(Game _g) external {
		require(tx.origin == owner() && stakingAddress() == address(0x0));
		info.g = _g;
		info.staking = new Staking(info.g, info.pair);
		_approve(address(this), stakingAddress(), UINT_MAX);
	}


	function mint(address _receiver, uint256 _tokens) external {
		require(msg.sender == address(info.g));
		info.totalSupply += _tokens;
		info.users[_receiver].balance += _tokens;
		emit Transfer(address(0x0), _receiver, _tokens);
	}

	function burn(uint256 _tokens) external {
		require(balanceOf(msg.sender) >= _tokens);
		info.totalSupply -= _tokens;
		info.users[msg.sender].balance -= _tokens;
		emit Transfer(msg.sender, address(0x0), _tokens);
	}

	function transfer(address _to, uint256 _tokens) external returns (bool) {
		return _transfer(msg.sender, _to, _tokens);
	}

	function approve(address _spender, uint256 _tokens) external returns (bool) {
		return _approve(msg.sender, _spender, _tokens);
	}

	function transferFrom(address _from, address _to, uint256 _tokens) external returns (bool) {
		uint256 _allowance = allowance(_from, msg.sender);
		require(_allowance >= _tokens);
		if (_allowance != UINT_MAX) {
			info.users[_from].allowance[msg.sender] -= _tokens;
		}
		return _transfer(_from, _to, _tokens);
	}

	function transferAndCall(address _to, uint256 _tokens, bytes calldata _data) external returns (bool) {
		uint256 _balanceBefore = balanceOf(_to);
		_transfer(msg.sender, _to, _tokens);
		uint256 _tokensReceived = balanceOf(_to) - _balanceBefore;
		uint32 _size;
		assembly {
			_size := extcodesize(_to)
		}
		if (_size > 0) {
			require(Callable(_to).tokenCallback(msg.sender, _tokensReceived, _data));
		}
		return true;
	}
	

	function bullsGameAddress() public view returns (address) {
		return address(info.g);
	}

	function pairAddress() external view returns (address) {
		return address(info.pair);
	}

	function stakingAddress() public view returns (address) {
		return address(info.staking);
	}

	function owner() public view returns (address) {
		return info.owner;
	}

	function isFromWhitelisted(address _address) public view returns (bool) {
		return info.fromWhitelist[_address];
	}

	function isToWhitelisted(address _address) public view returns (bool) {
		return info.toWhitelist[_address];
	}
	
	function totalSupply() public view returns (uint256) {
		return info.totalSupply;
	}

	function balanceOf(address _user) public view returns (uint256) {
		return info.users[_user].balance;
	}

	function allowance(address _user, address _spender) public view returns (uint256) {
		return info.users[_user].allowance[_spender];
	}

	function allInfoFor(address _user) external view returns (uint256 totalTokens, uint256 totalLPTokens, uint256 wethReserve, uint256 wsdmReserve, uint256 userAllowance, uint256 userBalance, uint256 userLPBalance) {
		totalTokens = totalSupply();
		totalLPTokens = info.pair.totalSupply();
		(uint256 _res0, uint256 _res1, ) = info.pair.getReserves();
		wethReserve = info.weth0 ? _res0 : _res1;
		wsdmReserve = info.weth0 ? _res1 : _res0;
		userAllowance = allowance(_user, bullsGameAddress());
		userBalance = balanceOf(_user);
		userLPBalance = info.pair.balanceOf(_user);
	}


	function _approve(address _owner, address _spender, uint256 _tokens) internal returns (bool) {
		info.users[_owner].allowance[_spender] = _tokens;
		emit Approval(_owner, _spender, _tokens);
		return true;
	}
	
	function _transfer(address _from, address _to, uint256 _tokens) internal returns (bool) {
		require(balanceOf(_from) >= _tokens);
		info.users[_from].balance -= _tokens;
		uint256 _fee = 0;
		if (!(_from == stakingAddress() || _to == stakingAddress() || _to == bullsGameAddress() || isFromWhitelisted(_from) || isToWhitelisted(_to))) {
			_fee = _tokens * TRANSFER_FEE / 100;
			address _this = address(this);
			info.users[_this].balance += _fee;
			emit Transfer(_from, _this, _fee);
			info.staking.disburse(balanceOf(_this));
		}
		info.users[_to].balance += _tokens - _fee;
		emit Transfer(_from, _to, _tokens - _fee);
		return true;
	}
}