import { connect, Contract, keyStores, WalletConnection } from 'near-api-js'
import getConfig from './config'
import { MerkleTree } from 'merkletreejs'
import SHA256 from 'crypto-js/sha256'
import { baseEncode, baseDecode } from 'borsh'
import nacl from 'tweetnacl'

const nearConfig = getConfig(process.env.NODE_ENV || 'development')

// Initialize contract & set global variables
export async function initContract() {
  // Initialize connection to the NEAR testnet
  const near = await connect(Object.assign({ deps: { keyStore: new keyStores.BrowserLocalStorageKeyStore() } }, nearConfig))

  // Initializing Wallet based Account. It can work with NEAR testnet wallet that
  // is hosted at https://wallet.testnet.near.org
  window.walletConnection = new WalletConnection(near)

  // Getting the Account ID. If still unauthorized, it's just empty string
  window.accountId = window.walletConnection.getAccountId()

  window.account = window.walletConnection.account()

  window.contract = await new Contract(window.walletConnection.account(), nearConfig.contractName, {
    // View methods are read only. They don't modify the state, but usually return some value.
    viewMethods: ['get_all_campaigns', 'get_ft_contract_by_campaign', 'check_issued_account', 'total_number_airdrop_campaigns', 
      'number_airdrop_campaigns_by_account', 'airdrop_campaigns_by_account', 'airdrop_merkle_root'],
    // Change methods can modify the state. But you don't receive the returned value when called.
    changeMethods: ['claim', 'get_ft_decimals'],
  })
}

export function logout() {
  window.walletConnection.signOut()
  // reload page
  window.location.replace(window.location.origin + window.location.pathname)
}

export async function login() {
  // Allow the current app to make calls to the specified contract on the
  // user's behalf.
  // This works by creating a new access key for the user's account and storing
  // the private key in localStorage.
  
  window.walletConnection.requestSignIn(nearConfig.contractName)

}

export function parseTokenWithDecimals(amount, decimals) {
  let amountD = amount / Math.pow(10, decimals);
  return Math.floor(amountD * 100 / 100);
}

export function parseTokenAmount(amount, decimals) {
  return amount * Math.pow(10, decimals);
}

export function buildMerkleTree(_leaves) {
  const leaves = _leaves.map(x => SHA256(x))
  const tree = new MerkleTree(leaves, SHA256)
  return tree
}

export function getProof(tree, leaf) {
	let proof = tree.getProof(leaf)
	proof = proof.map(x => {
		let y = {}
		y.position = x.position
		y.data = x.data.toString('hex')
		return y
	})
	return proof
}