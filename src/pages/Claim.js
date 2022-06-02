import React, { useEffect, useState} from 'react'
import {Button, PageHeader, notification, List, Avatar} from "antd";
import {default as PublicKey, transactions, utils, Contract} from "near-api-js"
import getConfig from '../config'
import axios from 'axios';
import { MerkleTree } from 'merkletreejs'
import SHA256 from 'crypto-js/sha256'
import { buildMerkleTree, getProof } from '../utils';

const nearConfig = getConfig(process.env.NODE_ENV || 'development')

function Claim() {

    const [campaigns, setCampaigns] = useState([]);

    useEffect(async () => {
        try {
            let response = await axios.get('http://localhost:4000/api/campaigns');
            console.log(response)
            let campaign_list = response["data"]["data"]["result"];
            setCampaigns(campaign_list);
        } catch (e) {
            console.log(e);
        }
    }, [])


    const numberCampaigns = campaigns.length;
    const title = `Airdrop List (${numberCampaigns} campaigns)`
    const items = campaigns.map((item, k) => <CampaignItem key={k} merkle_root={item.merkle_root} airdrop_id={k+1} leave={item.leave} ft_symbol={item.ft_symbol} ft_icon={item.ft_icon} owner={item.owner} ft_name={item.ft_name} />)

    return (
        <div>
            <PageHeader
                className="site-page-header"
                title={title}
            />
            <div style={{ padding: 30, display: "flex"}}>
                <List bordered={true} size="large" itemLayout="vertical">
                    {items}
                </List>
            </div>
        </div>
    )
}

const CampaignItem = ({airdrop_id, ft_symbol, ft_icon, owner, ft_name, leave, merkle_root}) => {
    const content = ft_name.concat(" (").concat(ft_symbol).concat(")");
    const href = nearConfig.explorerUrl + "/accounts/" + ft_name;
    const description = `Campaign owner: ${owner}`;
    console.log(`Merkle root: ${airdrop_id}`, merkle_root)

    const tree = buildMerkleTree(leave)
    let regex = /\s+/;
    let leaf = '';
    let amount = 0
    for (let l of leave) {
        let arr = l.split(regex)
        let account = arr[0]
        console.log(arr)
        console.log("leaf: ", l)
        if (account == window.accountId) {
            amount = parseInt(arr[1])
            leaf = SHA256(l)
            break
        }
         
    }
    const proof = getProof(tree, leaf)
    console.log(`Airdrop ${airdrop_id} of ${window.accountId}: ${amount} token`)
    
    const handleClaim = async () => {
        
        try {
            let result = await window.contract.claim({
                airdrop_id: airdrop_id,
                proof: proof,
                amount: amount
            })
            window.location.reload()
        } catch (e) {
            console.log(e)
        }
        
    }

    return (
        <List.Item style={{width: "70vw", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
            <List.Item.Meta 
                avatar={<Avatar src={ft_icon} size={"large"} style={{border: "1px solid gray"}}/>}
                title={<a href={href} target="_blank">{content}</a>}
                description={description}
            />
            <Btn airdrop_id={airdrop_id} proof={proof} handleClaim={handleClaim} />
        </List.Item>
    )
}

const Btn = ({ airdrop_id, proof, handleClaim }) => {
    let btn;
    console.log(`Proof: ${airdrop_id}`, proof)
    console.log("AirdropId: ", airdrop_id)
    const [isIssued, setIsIssued] = useState(false);
    useEffect(async () => {
        let issue = await window.contract.check_issued_account({
            airdrop_id: airdrop_id,
            account_id: window.accountId
        })
        setIsIssued(issue)
    }, [])
    if (proof.length != 0) {
        if (!isIssued) {
            btn = <div>
                <Button type="primary" ghost onClick={handleClaim}>
                    Claim
                </Button>
            </div>
        } else {
            btn = <div>
                <Button type="primary" disabled onClick={handleClaim}>
                    Claimed!
                </Button>
            </div>
        }
    } else {
        btn = <div></div>
    }
    return (
        <div>
            {btn}
        </div>
    )
}

export default Claim;