import React, { useEffect, useState} from 'react'
import {Button, PageHeader, notification, List, Avatar} from "antd";
import {SendOutlined, DollarCircleOutlined, EllipsisOutlined } from "@ant-design/icons";
import {default as PublicKey, transactions, utils, Contract} from "near-api-js"
import { functionCall, createTransaction } from "near-api-js/lib/transaction";
import {login, parseTokenAmount} from "../utils";
import BN from "bn.js";
import {baseDecode} from "borsh";
import getConfig from '../config'

const nearConfig = getConfig(process.env.NODE_ENV || 'development')

function Claim() {

    const [campaigns, setCampaigns] = useState([]);

    useEffect(async () => {
        try {
            let campaign_id_list = await window.contract.get_all_campaigns();
            let campaign_info = [];
            for (let i = 0; i < campaign_id_list.length; i++) {
                let airdrop_id = campaign_id_list[i];
                let ft_contract = await window.contract.get_ft_contract_by_campaign({ airdrop_id: airdrop_id });
                ft_contract = new Contract(window.walletConnection.account(), ft_contract, {
                    viewMethods: ['ft_metadata', 'ft_balance_of'],
                })
                let metadata = await ft_contract.ft_metadata();
                let merkle_root = await window.contract.airdrop_merkle_root({ airdrop_id: airdrop_id });
                metadata['merkle_root'] = merkle_root;

                campaign_info.push(metadata);
            }
            setCampaigns(campaign_info);
        } catch (e) {
            console.log(e);
        }
    }, [])

    const numberCampaigns = campaigns.length;
    const title = `Airdrop List (${numberCampaigns} campaigns)`
    const items = campaigns.map((item, k) => <CampaignItem key={k} name={item.name} symbol={item.symbol} icon={item.icon} merkle_root={item.merkle_root} />)

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

const CampaignItem = ({name, symbol, icon, merkle_root}) => {
    const content = name.concat(" (").concat(symbol).concat(")");
    const description = `Merkle root: ${merkle_root}`
    return (
        <List.Item style={{width: "640px"}}>
            <List.Item.Meta 
                avatar={<Avatar src={icon} size={"large"} style={{border: "1px solid gray"}}/>}
                title={<a href="#">{content}</a>}
                description={description}
            />
        </List.Item>
    )
}

export default Claim;